"""
LangGraph Corrective RAG (CRAG) Agent Service.

Implements a stateful Corrective Retrieval-Augmented Generation pipeline as a
LangGraph StateGraph. The graph orchestrates hybrid retrieval (dense + sparse),
Reciprocal Rank Fusion, LLM-driven relevance evaluation, conditional query
rewriting, and grounded synthesis with visual citations via Groq Cloud LPU.

Graph Topology:
    retrieve  →  evaluate_relevance  →  (conditional)
                                            ├─ "relevant"                → synthesize → END
                                            ├─ "ambiguous"/"irrelevant"
                                            │    AND attempts < 2        → rewrite_query → retrieve
                                            └─ "ambiguous"/"irrelevant"
                                                 AND attempts >= 2       → synthesize → END
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import StateGraph, END

logger = logging.getLogger("ai_service.langgraph_agent")


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------

class CRAGState(TypedDict):
    """Typed state dictionary flowing through every node of the CRAG graph."""

    query: str
    tenant_id: str
    top_k: int
    temperature: Optional[float]
    max_tokens: Optional[int]
    dense_results: List[Any]
    sparse_results: List[Any]
    fused_candidates: List[Any]
    relevance_decision: str  # "relevant" | "ambiguous" | "irrelevant"
    rewritten_query: Optional[str]
    retrieval_attempts: int
    synthesis_result: Optional[Dict[str, Any]]
    final_response: Optional[str]
    citations: List[Dict[str, Any]]
    error: Optional[str]


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class LangGraphCRAGAgent:
    """
    Corrective RAG agent built on LangGraph StateGraph.

    Wraps the existing Vector, Sparse, RRF, and Groq services into a
    self-correcting retrieval pipeline with automatic relevance evaluation
    and query rewriting (up to 2 retries).
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
        logger.info("LangGraphCRAGAgent compiled and ready.")

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------

    def _build_graph(self) -> Any:
        """Construct and compile the CRAG StateGraph."""

        graph = StateGraph(CRAGState)

        # Register nodes
        graph.add_node("retrieve", self._node_retrieve)
        graph.add_node("evaluate_relevance", self._node_evaluate_relevance)
        graph.add_node("rewrite_query", self._node_rewrite_query)
        graph.add_node("synthesize", self._node_synthesize)

        # Entry point
        graph.set_entry_point("retrieve")

        # Edges
        graph.add_edge("retrieve", "evaluate_relevance")
        graph.add_conditional_edges(
            "evaluate_relevance",
            self._route_after_evaluation,
            {
                "synthesize": "synthesize",
                "rewrite_query": "rewrite_query",
            },
        )
        graph.add_edge("rewrite_query", "retrieve")
        graph.add_edge("synthesize", END)

        return graph.compile()

    # ------------------------------------------------------------------
    # Routing logic
    # ------------------------------------------------------------------

    @staticmethod
    def _route_after_evaluation(state: CRAGState) -> str:
        """
        Conditional edge selector after relevance evaluation.

        Returns the next node name based on relevance decision and retry budget.
        """
        decision = state.get("relevance_decision", "relevant")
        attempts = state.get("retrieval_attempts", 0)

        if decision == "relevant":
            return "synthesize"

        # Ambiguous or irrelevant – retry if budget remains
        if attempts < LangGraphCRAGAgent.MAX_RETRIEVAL_ATTEMPTS:
            return "rewrite_query"

        # Budget exhausted – synthesize with whatever we have
        return "synthesize"

    # ------------------------------------------------------------------
    # Node implementations
    # ------------------------------------------------------------------

    def _node_retrieve(self, state: CRAGState) -> Dict[str, Any]:
        """
        Hybrid retrieval node: executes dense + sparse search, then RRF fusion.

        Uses ``rewritten_query`` when available, otherwise the original query.
        """
        effective_query = state.get("rewritten_query") or state["query"]
        tenant_id = state["tenant_id"]
        top_k = state.get("top_k", 5)

        logger.info(
            "CRAG retrieve | query='%s' | tenant='%s' | attempt=%d",
            effective_query[:80],
            tenant_id,
            state.get("retrieval_attempts", 0) + 1,
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

        return {
            "dense_results": dense_results,
            "sparse_results": sparse_results,
            "fused_candidates": fused_candidates,
        }

    def _node_evaluate_relevance(self, state: CRAGState) -> Dict[str, Any]:
        """
        Relevance evaluation node: uses Groq LLM to classify whether the
        top-retrieved documents adequately address the query.

        Returns one of ``"relevant"``, ``"ambiguous"``, or ``"irrelevant"``.
        Defaults to ``"relevant"`` when the Groq client is unavailable or on error.
        """
        fused = state.get("fused_candidates", [])

        # Nothing retrieved → irrelevant
        if not fused:
            logger.info("CRAG evaluate_relevance | no candidates → irrelevant")
            return {"relevance_decision": "irrelevant"}

        # If Groq is not configured, skip evaluation and proceed
        if not self.groq_service.is_configured():
            logger.info("CRAG evaluate_relevance | Groq unconfigured → defaulting to relevant")
            return {"relevance_decision": "relevant"}

        query = state.get("rewritten_query") or state["query"]

        # Build a compact context from top-3 fused docs
        snippets: List[str] = []
        for i, doc in enumerate(fused[:3], start=1):
            content = ""
            if hasattr(doc, "content"):
                content = doc.content
            elif isinstance(doc, dict):
                content = doc.get("content", "")
            snippets.append(f"[{i}] {str(content)[:300]}")
        context_block = "\n".join(snippets)

        evaluation_prompt = (
            "You are a retrieval quality evaluator. Given a user query and retrieved document snippets, "
            "classify the retrieval quality as exactly one of: relevant, ambiguous, irrelevant.\n\n"
            "Rules:\n"
            "- 'relevant': The snippets clearly and directly answer the query.\n"
            "- 'ambiguous': The snippets are partially related but may not fully answer the query.\n"
            "- 'irrelevant': The snippets do not relate to the query at all.\n\n"
            f"Query: {query}\n\n"
            f"Retrieved Snippets:\n{context_block}\n\n"
            "Respond with ONLY one word: relevant, ambiguous, or irrelevant."
        )

        try:
            completion = self.groq_service.client.chat.completions.create(
                messages=[{"role": "user", "content": evaluation_prompt}],
                model=self.groq_service.model,
                temperature=0.0,
                max_tokens=10,
            )
            raw_answer = (completion.choices[0].message.content or "").strip().lower()
            # Also handle thinking-model outputs that embed reasoning
            reasoning = getattr(completion.choices[0].message, "reasoning", None)
            if not raw_answer and reasoning:
                raw_answer = reasoning.strip().lower()

            # Normalise response to one of the three valid labels
            if "irrelevant" in raw_answer:
                decision = "irrelevant"
            elif "ambiguous" in raw_answer:
                decision = "ambiguous"
            else:
                decision = "relevant"

            logger.info("CRAG evaluate_relevance | decision=%s (raw='%s')", decision, raw_answer[:30])
            return {"relevance_decision": decision}

        except Exception as exc:
            logger.warning(
                "CRAG evaluate_relevance | Groq call failed (%s) → defaulting to relevant",
                str(exc)[:120],
            )
            return {"relevance_decision": "relevant"}

    def _node_rewrite_query(self, state: CRAGState) -> Dict[str, Any]:
        """
        Query rewriting node: uses Groq LLM to produce an improved query
        phrasing that may yield better retrieval results.

        Increments ``retrieval_attempts`` on every invocation.
        """
        current_attempts = state.get("retrieval_attempts", 0)
        original_query = state["query"]
        previous_query = state.get("rewritten_query") or original_query

        logger.info(
            "CRAG rewrite_query | attempt=%d | previous='%s'",
            current_attempts + 1,
            previous_query[:80],
        )

        # If Groq is not configured, just reuse the original query
        if not self.groq_service.is_configured():
            logger.info("CRAG rewrite_query | Groq unconfigured → reusing original query")
            return {
                "rewritten_query": original_query,
                "retrieval_attempts": current_attempts + 1,
            }

        rewrite_prompt = (
            "You are a search query optimizer. The original user query did not retrieve "
            "sufficiently relevant documents. Rewrite the query to improve retrieval.\n\n"
            "Rules:\n"
            "- Preserve the user's intent.\n"
            "- Use different keywords, synonyms, or rephrase for clarity.\n"
            "- Output ONLY the rewritten query, nothing else.\n\n"
            f"Original Query: {original_query}\n"
            f"Previous Query Attempt: {previous_query}\n\n"
            "Rewritten Query:"
        )

        try:
            completion = self.groq_service.client.chat.completions.create(
                messages=[{"role": "user", "content": rewrite_prompt}],
                model=self.groq_service.model,
                temperature=0.7,
                max_tokens=100,
            )
            rewritten = (completion.choices[0].message.content or "").strip()
            # Handle thinking-model edge case
            reasoning = getattr(completion.choices[0].message, "reasoning", None)
            if not rewritten and reasoning:
                rewritten = reasoning.strip()

            if not rewritten:
                rewritten = original_query

            logger.info("CRAG rewrite_query | rewritten='%s'", rewritten[:80])
            return {
                "rewritten_query": rewritten,
                "retrieval_attempts": current_attempts + 1,
            }

        except Exception as exc:
            logger.warning(
                "CRAG rewrite_query | Groq call failed (%s) → reusing original query",
                str(exc)[:120],
            )
            return {
                "rewritten_query": original_query,
                "retrieval_attempts": current_attempts + 1,
            }

    def _node_synthesize(self, state: CRAGState) -> Dict[str, Any]:
        """
        Synthesis node: delegates to the existing ``GroqGenerationService``
        to produce a grounded answer with visual citations.
        """
        effective_query = state.get("rewritten_query") or state["query"]
        fused = state.get("fused_candidates", [])

        logger.info(
            "CRAG synthesize | query='%s' | candidates=%d",
            effective_query[:80],
            len(fused),
        )

        try:
            synthesis = self.groq_service.generate_synthesis(
                query=effective_query,
                context_documents=fused,
                tenant_id=state["tenant_id"],
                temperature=state.get("temperature"),
                max_tokens=state.get("max_tokens"),
            )
        except Exception as exc:
            logger.error("CRAG synthesize | generation failed: %s", exc, exc_info=True)
            synthesis = {
                "synthesized_response": (
                    "The retrieved documents do not contain sufficient verified evidence "
                    "to address this inquiry."
                ),
                "citations": [],
                "model_used": self.groq_service.model,
                "provider": "error-fallback",
            }

        return {
            "synthesis_result": synthesis,
            "final_response": synthesis.get("synthesized_response", ""),
            "citations": synthesis.get("citations", []),
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
        Execute the full CRAG pipeline and return the final state.

        Args:
            query: User inquiry text.
            tenant_id: Multi-tenant boundary identifier.
            top_k: Maximum number of retrieval candidates.
            temperature: Optional sampling temperature override for synthesis.
            max_tokens: Optional maximum output tokens override for synthesis.

        Returns:
            The final CRAGState dictionary containing ``synthesis_result``,
            ``final_response``, ``citations``, ``fused_candidates``, and all
            intermediate state values.
        """
        initial_state: CRAGState = {
            "query": query,
            "tenant_id": tenant_id,
            "top_k": top_k,
            "temperature": temperature,
            "max_tokens": max_tokens,
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
            "CRAG invoke complete | decision=%s | attempts=%d | citations=%d",
            final_state.get("relevance_decision", "n/a"),
            final_state.get("retrieval_attempts", 0),
            len(final_state.get("citations", [])),
        )

        return dict(final_state)
