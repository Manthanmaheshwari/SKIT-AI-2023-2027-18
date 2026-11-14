"""
LangGraph Corrective RAG (CRAG) Agent Service.

Implements a stateful Corrective Retrieval-Augmented Generation pipeline as a
LangGraph StateGraph. The graph orchestrates hybrid retrieval (dense + sparse),
Reciprocal Rank Fusion (RRF), LLM-driven relevance evaluation, conditional query
rewriting (up to 2 retries), and grounded synthesis with visual citations via Groq Cloud LPU.

Graph Topology:
    retrieve_hybrid_context  →  evaluate_context_relevance  →  (conditional)
                                                                 ├─ "relevant"                     → generate_verified_response → END
                                                                 ├─ "ambiguous"/"irrelevant"
                                                                 │    AND rewrite_count < 2        → conditional_query_rewriter → retrieve_hybrid_context
                                                                 └─ "ambiguous"/"irrelevant"
                                                                      AND rewrite_count >= 2       → generate_verified_response → END
"""

from __future__ import annotations

import time
import logging
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import StateGraph, END

logger = logging.getLogger("ai_service.langgraph_agent")


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------

class GraphState(TypedDict):
    """
    Strongly-typed state dictionary tracking the complete execution lifecycle
    of the Corrective RAG (CRAG) LangGraph state machine.
    """

    # Core user requirements
    query: str
    tenant_id: str
    retrieved_chunks: List[Any]
    relevance_grades: List[Dict[str, Any]]
    rewrite_count: int
    final_answer: Optional[str]

    # Execution telemetry & observability
    execution_trace: List[Dict[str, Any]]

    # Retrieval and synthesis operational parameters
    top_k: int
    temperature: Optional[float]
    max_tokens: Optional[int]
    rewritten_query: Optional[str]
    relevance_decision: str  # "relevant" | "ambiguous" | "irrelevant"
    synthesis_result: Optional[Dict[str, Any]]
    citations: List[Dict[str, Any]]

    # Aliases & mirrors for full backward compatibility
    dense_results: List[Any]
    sparse_results: List[Any]
    fused_candidates: List[Any]
    final_response: Optional[str]
    retrieval_attempts: int
    error: Optional[str]


# Backward compatibility alias
CRAGState = GraphState


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class LangGraphCRAGAgent:
    """
    Corrective RAG agent built on LangGraph StateGraph.

    Wraps the existing Vector, Sparse, RRF, and Groq services into a
    self-correcting retrieval pipeline with automatic relevance evaluation,
    conditional query rewriting (up to 2 retries), and detailed state execution tracing.
    """

    # Maximum number of retrieval retry cycles before forcing synthesis
    MAX_RETRIEVAL_ATTEMPTS = 2

    def __init__(
        self,
        vector_service: Any,
        sparse_service: Any,
        rrf_service: Any,
        groq_service: Any,
    ) -> None:
        """
        Initialize the CRAG agent and compile the LangGraph StateGraph.

        Args:
            vector_service: VectorEmbeddingService instance for dense retrieval.
            sparse_service: SparseKeywordService instance for BM25 retrieval.
            rrf_service: ReciprocalRankFusionService instance for rank fusion.
            groq_service: GroqGenerationService instance for synthesis & LLM calls.
        """
        self.vector_service = vector_service
        self.sparse_service = sparse_service
        self.rrf_service = rrf_service
        self.groq_service = groq_service

        self._graph = self._build_graph()
        logger.info("LangGraphCRAGAgent compiled and ready with GraphState execution tracing.")

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------

    def _build_graph(self) -> Any:
        """Construct and compile the CRAG StateGraph."""

        graph = StateGraph(GraphState)

        # Register nodes with exact architectural names
        graph.add_node("retrieve_hybrid_context", self._node_retrieve_hybrid_context)
        graph.add_node("evaluate_context_relevance", self._node_evaluate_context_relevance)
        graph.add_node("conditional_query_rewriter", self._node_conditional_query_rewriter)
        graph.add_node("generate_verified_response", self._node_generate_verified_response)

        # Entry point
        graph.set_entry_point("retrieve_hybrid_context")

        # Edges
        graph.add_edge("retrieve_hybrid_context", "evaluate_context_relevance")
        graph.add_conditional_edges(
            "evaluate_context_relevance",
            self._route_after_evaluation,
            {
                "generate_verified_response": "generate_verified_response",
                "conditional_query_rewriter": "conditional_query_rewriter",
            },
        )
        graph.add_edge("conditional_query_rewriter", "retrieve_hybrid_context")
        graph.add_edge("generate_verified_response", END)

        return graph.compile()

    # ------------------------------------------------------------------
    # Routing logic
    # ------------------------------------------------------------------

    @staticmethod
    def _route_after_evaluation(state: GraphState) -> str:
        """
        Conditional edge selector after relevance evaluation.

        Returns:
            - 'generate_verified_response' if relevance is 'relevant' or retry budget is exhausted.
            - 'conditional_query_rewriter' if relevance is 'ambiguous' or 'irrelevant' and rewrite_count < 2.
        """
        decision = state.get("relevance_decision", "relevant")
        rewrite_count = state.get("rewrite_count")
        if rewrite_count is None:
            rewrite_count = state.get("retrieval_attempts", 0)

        if decision == "relevant":
            logger.info("CRAG routing | context is relevant → proceeding to generate_verified_response")
            return "generate_verified_response"

        # Low-relevance path: retry if budget remains
        if rewrite_count < LangGraphCRAGAgent.MAX_RETRIEVAL_ATTEMPTS:
            logger.info(
                "CRAG routing | decision='%s' (rewrite_count=%d < %d) → routing to conditional_query_rewriter",
                decision,
                rewrite_count,
                LangGraphCRAGAgent.MAX_RETRIEVAL_ATTEMPTS,
            )
            return "conditional_query_rewriter"

        # Budget exhausted – proceed to synthesis with best available evidence
        logger.info(
            "CRAG routing | decision='%s' (rewrite_count=%d exhausted) → forcing generate_verified_response",
            decision,
            rewrite_count,
        )
        return "generate_verified_response"

    # ------------------------------------------------------------------
    # Node implementations
    # ------------------------------------------------------------------

    def _node_retrieve_hybrid_context(self, state: GraphState) -> Dict[str, Any]:
        """
        Hybrid retrieval node:
        Executes concurrent dense vector search (ChromaDB) and sparse lexical search (BM25),
        fused via Reciprocal Rank Fusion (k=60) with tenant isolation.
        """
        effective_query = state.get("rewritten_query") or state["query"]
        tenant_id = state["tenant_id"]
        top_k = state.get("top_k", 5)
        current_rewrite_count = state.get("rewrite_count", 0)

        logger.info(
            "CRAG [retrieve_hybrid_context] | query='%s' | tenant='%s' | rewrite_count=%d",
            effective_query[:80],
            tenant_id,
            current_rewrite_count,
        )

        try:
            dense_results = self.vector_service.search(
                query=effective_query,
                tenant_id=tenant_id,
                top_k=top_k,
            )
        except Exception as exc:
            logger.error("Dense retrieval failed: %s", exc, exc_info=True)
            dense_results = []

        try:
            sparse_results = self.sparse_service.search(
                query=effective_query,
                tenant_id=tenant_id,
                top_k=top_k,
            )
        except Exception as exc:
            logger.error("Sparse retrieval failed: %s", exc, exc_info=True)
            sparse_results = []

        try:
            fused_candidates = self.rrf_service.fuse_results(
                dense_results=dense_results,
                sparse_results=sparse_results,
                top_k=top_k,
            )
        except Exception as exc:
            logger.error("RRF fusion failed: %s", exc, exc_info=True)
            fused_candidates = []

        trace_step = {
            "node": "retrieve_hybrid_context",
            "action": "hybrid_retrieval_and_rrf",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": {
                "active_query": effective_query,
                "dense_hits": len(dense_results),
                "sparse_hits": len(sparse_results),
                "fused_count": len(fused_candidates),
                "rewrite_count": current_rewrite_count,
            },
        }
        current_trace = list(state.get("execution_trace", [])) + [trace_step]

        return {
            "dense_results": dense_results,
            "sparse_results": sparse_results,
            "retrieved_chunks": fused_candidates,
            "fused_candidates": fused_candidates,
            "execution_trace": current_trace,
        }

    def _node_evaluate_context_relevance(self, state: GraphState) -> Dict[str, Any]:
        """
        Context relevance evaluation node:
        Evaluates whether the retrieved context chunks contain sufficient, verified evidence
        to ground an accurate answer. Produces granular relevance_grades and sets relevance_decision.
        """
        chunks = state.get("retrieved_chunks") or state.get("fused_candidates", [])
        active_query = state.get("rewritten_query") or state["query"]
        current_rewrite_count = state.get("rewrite_count", 0)

        # Case 1: No candidate chunks retrieved at all
        if not chunks:
            logger.info("CRAG [evaluate_context_relevance] | no candidate chunks → irrelevant")
            decision = "irrelevant"
            relevance_grades = [
                {"chunk_index": 0, "chunk_id": "none", "grade": "irrelevant", "confidence": 0.0, "reason": "No retrieved chunks"}
            ]
            trace_step = {
                "node": "evaluate_context_relevance",
                "action": "relevance_evaluation",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "details": {
                    "relevance_decision": decision,
                    "relevance_grades": relevance_grades,
                    "reason": "Zero retrieved candidates",
                    "rewrite_count": current_rewrite_count,
                },
            }
            return {
                "relevance_decision": decision,
                "relevance_grades": relevance_grades,
                "execution_trace": list(state.get("execution_trace", [])) + [trace_step],
            }

        # Case 2: Groq service is not configured (offline/deterministic mode)
        if not self.groq_service.is_configured():
            logger.info("CRAG [evaluate_context_relevance] | Groq unconfigured → defaulting to relevant")
            decision = "relevant"
            relevance_grades = [
                {
                    "chunk_index": idx,
                    "chunk_id": getattr(c, "id", f"doc_{idx}"),
                    "grade": "relevant",
                    "confidence": getattr(c, "score", 0.90),
                    "note": "Deterministic offline mode",
                }
                for idx, c in enumerate(chunks[:3], start=1)
            ]
            trace_step = {
                "node": "evaluate_context_relevance",
                "action": "relevance_evaluation",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "details": {
                    "relevance_decision": decision,
                    "relevance_grades": relevance_grades,
                    "mode": "offline_default",
                    "rewrite_count": current_rewrite_count,
                },
            }
            return {
                "relevance_decision": decision,
                "relevance_grades": relevance_grades,
                "execution_trace": list(state.get("execution_trace", [])) + [trace_step],
            }

        # Case 3: LLM-driven evaluation with Groq
        snippets: List[str] = []
        for i, doc in enumerate(chunks[:3], start=1):
            content = ""
            if hasattr(doc, "content"):
                content = doc.content
            elif isinstance(doc, dict):
                content = doc.get("content", "")
            snippets.append(f"[Snippet #{i} | ID: {getattr(doc, 'id', f'chunk_{i}')}]\n{str(content)[:320]}")
        context_block = "\n\n".join(snippets)

        evaluation_prompt = (
            "You are a strict retrieval relevance evaluator for an enterprise research RAG engine.\n"
            "Given a user query and retrieved document snippets, classify the retrieval quality as exactly one of:\n"
            "- relevant (the snippets directly contain facts or technical answers to address the query)\n"
            "- ambiguous (the snippets are tangentially related or incomplete)\n"
            "- irrelevant (the snippets do not contain relevant information)\n\n"
            f"User Query: {active_query}\n\n"
            f"Retrieved Document Snippets:\n{context_block}\n\n"
            "Respond with ONLY one word: relevant, ambiguous, or irrelevant."
        )

        try:
            completion = self.groq_service.client.chat.completions.create(
                messages=[{"role": "user", "content": evaluation_prompt}],
                model=self.groq_service.model,
                temperature=0.0,
                max_tokens=15,
            )
            raw_answer = (completion.choices[0].message.content or "").strip().lower()
            reasoning = getattr(completion.choices[0].message, "reasoning", None)
            if not raw_answer and reasoning:
                raw_answer = reasoning.strip().lower()

            if "irrelevant" in raw_answer:
                decision = "irrelevant"
            elif "ambiguous" in raw_answer:
                decision = "ambiguous"
            else:
                decision = "relevant"

            relevance_grades = []
            for idx, doc in enumerate(chunks[:3], start=1):
                doc_id = getattr(doc, "id", f"chunk_{idx}")
                doc_score = float(getattr(doc, "score", 0.90))
                relevance_grades.append({
                    "chunk_index": idx,
                    "chunk_id": doc_id,
                    "grade": decision,
                    "score": doc_score,
                })

            logger.info("CRAG [evaluate_context_relevance] | decision=%s (raw='%s')", decision, raw_answer[:30])

        except Exception as exc:
            logger.warning("CRAG [evaluate_context_relevance] | Groq failed (%s) → defaulting to relevant", str(exc)[:120])
            decision = "relevant"
            relevance_grades = [
                {"chunk_index": 1, "grade": "relevant", "note": f"Fallback on error: {str(exc)[:60]}"}
            ]

        trace_step = {
            "node": "evaluate_context_relevance",
            "action": "relevance_evaluation",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": {
                "relevance_decision": decision,
                "relevance_grades": relevance_grades,
                "evaluator_model": self.groq_service.model,
                "rewrite_count": current_rewrite_count,
            },
        }

        return {
            "relevance_decision": decision,
            "relevance_grades": relevance_grades,
            "execution_trace": list(state.get("execution_trace", [])) + [trace_step],
        }

    def _node_conditional_query_rewriter(self, state: GraphState) -> Dict[str, Any]:
        """
        Query rewriting node:
        Triggered when context relevance is ambiguous or irrelevant and rewrite_count < 2.
        Uses Groq LLM to rewrite the query into an optimized, keyword-rich search inquiry.
        """
        current_rewrites = state.get("rewrite_count", 0)
        new_rewrite_count = current_rewrites + 1
        original_query = state["query"]
        previous_query = state.get("rewritten_query") or original_query

        logger.info(
            "CRAG [conditional_query_rewriter] | rewrite_count=%d | previous='%s'",
            new_rewrite_count,
            previous_query[:80],
        )

        if not self.groq_service.is_configured():
            logger.info("CRAG [conditional_query_rewriter] | Groq unconfigured → reusing original query")
            rewritten = original_query
        else:
            rewrite_prompt = (
                "You are an expert search query reformulation engine for an enterprise RAG system.\n"
                "The previous search inquiry did not return sufficiently relevant context documents.\n"
                "Rewrite the inquiry to optimize hybrid vector and keyword recall:\n"
                "- Preserve the core factual intent of the user.\n"
                "- Introduce technical synonyms, related domain terminology, or clearer phrasing.\n"
                "- Output ONLY the rewritten search query with NO quotes, conversational filler, or preamble.\n\n"
                f"Original User Query: {original_query}\n"
                f"Previous Query Attempt: {previous_query}\n\n"
                "Optimized Search Query:"
            )

            try:
                completion = self.groq_service.client.chat.completions.create(
                    messages=[{"role": "user", "content": rewrite_prompt}],
                    model=self.groq_service.model,
                    temperature=0.6,
                    max_tokens=90,
                )
                rewritten = (completion.choices[0].message.content or "").strip()
                reasoning = getattr(completion.choices[0].message, "reasoning", None)
                if not rewritten and reasoning:
                    rewritten = reasoning.strip()

                if not rewritten:
                    rewritten = original_query

                logger.info("CRAG [conditional_query_rewriter] | rewritten='%s'", rewritten[:80])

            except Exception as exc:
                logger.warning("CRAG [conditional_query_rewriter] | Groq call failed (%s) → reusing original query", str(exc)[:120])
                rewritten = original_query

        trace_step = {
            "node": "conditional_query_rewriter",
            "action": "query_reformulation",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": {
                "rewrite_count": new_rewrite_count,
                "original_query": original_query,
                "previous_query": previous_query,
                "rewritten_query": rewritten,
            },
        }

        return {
            "rewritten_query": rewritten,
            "rewrite_count": new_rewrite_count,
            "retrieval_attempts": new_rewrite_count,
            "execution_trace": list(state.get("execution_trace", [])) + [trace_step],
        }

    def _node_generate_verified_response(self, state: GraphState) -> Dict[str, Any]:
        """
        Grounded synthesis node:
        Delegates to GroqGenerationService to synthesize a verified answer strictly anchored
        to retrieved evidence with formal visual citation anchors.
        """
        effective_query = state.get("rewritten_query") or state["query"]
        fused = state.get("retrieved_chunks") or state.get("fused_candidates", [])
        tenant_id = state["tenant_id"]

        logger.info(
            "CRAG [generate_verified_response] | query='%s' | chunks=%d",
            effective_query[:80],
            len(fused),
        )

        try:
            synthesis = self.groq_service.generate_synthesis(
                query=effective_query,
                context_documents=fused,
                tenant_id=tenant_id,
                temperature=state.get("temperature"),
                max_tokens=state.get("max_tokens"),
            )
        except Exception as exc:
            logger.error("CRAG [generate_verified_response] | generation failed: %s", exc, exc_info=True)
            synthesis = {
                "synthesized_response": (
                    "The retrieved documents do not contain sufficient verified evidence "
                    "to address this inquiry."
                ),
                "citations": [],
                "model_used": self.groq_service.model,
                "provider": "error-fallback",
            }

        final_answer = synthesis.get("synthesized_response", "")
        citations = synthesis.get("citations", [])

        trace_step = {
            "node": "generate_verified_response",
            "action": "grounded_synthesis_with_citations",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": {
                "model_used": synthesis.get("model_used", self.groq_service.model),
                "provider": synthesis.get("provider", "groq-cloud-lpu"),
                "citations_count": len(citations),
                "retrieved_chunks_synthesized": len(fused),
                "rewrite_count": state.get("rewrite_count", 0),
            },
        }

        return {
            "synthesis_result": synthesis,
            "final_answer": final_answer,
            "final_response": final_answer,
            "citations": citations,
            "execution_trace": list(state.get("execution_trace", [])) + [trace_step],
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def invoke(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Execute the full self-correcting CRAG pipeline and return the final GraphState.

        Args:
            query: User inquiry text.
            tenant_id: Multi-tenant boundary identifier.
            top_k: Maximum number of retrieval candidates.
            temperature: Optional sampling temperature override for synthesis.
            max_tokens: Optional maximum output tokens override for synthesis.

        Returns:
            The final GraphState dictionary containing ``final_answer``, ``retrieved_chunks``,
            ``relevance_grades``, ``rewrite_count``, ``execution_trace``, ``citations``,
            and all intermediate execution attributes.
        """
        initial_state: GraphState = {
            "query": query,
            "tenant_id": tenant_id,
            "top_k": top_k,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "retrieved_chunks": [],
            "relevance_grades": [],
            "rewrite_count": 0,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [],
            "relevance_decision": "",
            "rewritten_query": None,
            "retrieval_attempts": 0,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }

        logger.info(
            "CRAG invoke | query='%s' | tenant='%s' | top_k=%d",
            query[:80],
            tenant_id,
            top_k,
        )

        final_state = self._graph.invoke(initial_state)

        logger.info(
            "CRAG invoke complete | decision=%s | rewrites=%d | trace_steps=%d | citations=%d",
            final_state.get("relevance_decision", "n/a"),
            final_state.get("rewrite_count", 0),
            len(final_state.get("execution_trace", [])),
            len(final_state.get("citations", [])),
        )

        return dict(final_state)
