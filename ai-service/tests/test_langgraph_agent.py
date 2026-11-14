"""
Unit tests for LangGraphCRAGAgent.

Validates StateGraph compilation, state routing decisions, node execution,
and integration with vector, sparse, RRF, and Groq services.
"""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock
from services.langgraph_rag_agent import LangGraphCRAGAgent, GraphState, CRAGState
from services.rrf_service import RankedDocument, FusedDocument


class TestLangGraphCRAGAgent(unittest.TestCase):
    """Test suite for LangGraph Corrective RAG state graph agent."""

    def setUp(self):
        self.mock_vector_service = MagicMock()
        self.mock_sparse_service = MagicMock()
        self.mock_rrf_service = MagicMock()
        self.mock_groq_service = MagicMock()

        self.mock_groq_service.is_configured.return_value = False
        self.mock_groq_service.model = "test-model"

        self.agent = LangGraphCRAGAgent(
            vector_service=self.mock_vector_service,
            sparse_service=self.mock_sparse_service,
            rrf_service=self.mock_rrf_service,
            groq_service=self.mock_groq_service,
        )

    def test_graph_initialization(self):
        """Verify StateGraph compiles and initializes cleanly."""
        self.assertIsNotNone(self.agent._graph)
        self.assertEqual(CRAGState, GraphState)

    def test_routing_logic_relevant(self):
        """Verify routing sends relevant decision to generate_verified_response."""
        state: GraphState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [],
            "relevance_grades": [],
            "rewrite_count": 0,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [],
            "relevance_decision": "relevant",
            "rewritten_query": None,
            "retrieval_attempts": 0,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }
        next_node = self.agent._route_after_evaluation(state)
        self.assertEqual(next_node, "generate_verified_response")

    def test_routing_logic_retry_under_budget(self):
        """Verify ambiguous/irrelevant decision triggers conditional_query_rewriter when rewrite_count < 2."""
        state: GraphState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [],
            "relevance_grades": [],
            "rewrite_count": 1,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [],
            "relevance_decision": "irrelevant",
            "rewritten_query": None,
            "retrieval_attempts": 1,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }
        next_node = self.agent._route_after_evaluation(state)
        self.assertEqual(next_node, "conditional_query_rewriter")

    def test_routing_logic_exhausted_budget(self):
        """Verify routing forces generate_verified_response when rewrite budget reaches limit."""
        state: GraphState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [],
            "relevance_grades": [],
            "rewrite_count": 2,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [],
            "relevance_decision": "irrelevant",
            "rewritten_query": None,
            "retrieval_attempts": 2,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }
        next_node = self.agent._route_after_evaluation(state)
        self.assertEqual(next_node, "generate_verified_response")

    def test_node_retrieve_hybrid_context(self):
        """Verify retrieve_hybrid_context node calls dense, sparse, and RRF services and logs trace."""
        doc1 = FusedDocument(id="doc_1", document_id="paper.pdf", content="Architecture of CRAG", score=0.92, rrf_score=0.92)
        self.mock_vector_service.search.return_value = ["dense_1"]
        self.mock_sparse_service.search.return_value = ["sparse_1"]
        self.mock_rrf_service.fuse_results.return_value = [doc1]

        state: GraphState = {
            "query": "what is crag",
            "tenant_id": "tenant-corp",
            "top_k": 3,
            "temperature": None,
            "max_tokens": None,
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

        output = self.agent._node_retrieve_hybrid_context(state)
        self.assertIn("retrieved_chunks", output)
        self.assertIn("fused_candidates", output)
        self.assertEqual(len(output["retrieved_chunks"]), 1)
        self.assertEqual(len(output["execution_trace"]), 1)
        self.assertEqual(output["execution_trace"][0]["node"], "retrieve_hybrid_context")

    def test_node_evaluate_context_relevance_offline(self):
        """Verify evaluate_context_relevance safely defaults to relevant when Groq is unconfigured."""
        doc1 = FusedDocument(id="doc_1", document_id="paper.pdf", content="Architecture of CRAG", score=0.92, rrf_score=0.92)
        state: GraphState = {
            "query": "what is crag",
            "tenant_id": "tenant-corp",
            "top_k": 3,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [doc1],
            "relevance_grades": [],
            "rewrite_count": 0,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [doc1],
            "relevance_decision": "",
            "rewritten_query": None,
            "retrieval_attempts": 0,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }

        output = self.agent._node_evaluate_context_relevance(state)
        self.assertEqual(output["relevance_decision"], "relevant")
        self.assertTrue(len(output["relevance_grades"]) > 0)
        self.assertEqual(output["relevance_grades"][0]["grade"], "relevant")
        self.assertEqual(output["execution_trace"][-1]["node"], "evaluate_context_relevance")

    def test_node_conditional_query_rewriter(self):
        """Verify conditional_query_rewriter increments rewrite_count and updates rewritten_query."""
        state: GraphState = {
            "query": "crag pipeline",
            "tenant_id": "tenant-corp",
            "top_k": 3,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [],
            "relevance_grades": [],
            "rewrite_count": 0,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [],
            "relevance_decision": "irrelevant",
            "rewritten_query": None,
            "retrieval_attempts": 0,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }

        output = self.agent._node_conditional_query_rewriter(state)
        self.assertEqual(output["rewrite_count"], 1)
        self.assertIsNotNone(output["rewritten_query"])
        self.assertEqual(output["execution_trace"][-1]["node"], "conditional_query_rewriter")

    def test_node_generate_verified_response(self):
        """Verify generate_verified_response delegates to Groq synthesis and sets final_answer."""
        doc1 = FusedDocument(id="doc_1", document_id="paper.pdf", content="Architecture of CRAG", score=0.92, rrf_score=0.92)
        self.mock_groq_service.generate_synthesis.return_value = {
            "synthesized_response": "CRAG uses LangGraph state machines [Citation: paper.pdf, Page 1].",
            "citations": [{"document_id": "paper.pdf", "page": 1, "snippet": "Architecture of CRAG", "score": 0.92}],
            "model_used": "test-model",
            "provider": "groq-test",
        }

        state: GraphState = {
            "query": "what is crag",
            "tenant_id": "tenant-corp",
            "top_k": 3,
            "temperature": None,
            "max_tokens": None,
            "retrieved_chunks": [doc1],
            "relevance_grades": [{"chunk_index": 1, "grade": "relevant"}],
            "rewrite_count": 0,
            "final_answer": None,
            "execution_trace": [],
            "dense_results": [],
            "sparse_results": [],
            "fused_candidates": [doc1],
            "relevance_decision": "relevant",
            "rewritten_query": None,
            "retrieval_attempts": 0,
            "synthesis_result": None,
            "final_response": None,
            "citations": [],
            "error": None,
        }

        output = self.agent._node_generate_verified_response(state)
        self.assertEqual(output["final_answer"], "CRAG uses LangGraph state machines [Citation: paper.pdf, Page 1].")
        self.assertEqual(output["final_response"], output["final_answer"])
        self.assertEqual(len(output["citations"]), 1)
        self.assertEqual(output["execution_trace"][-1]["node"], "generate_verified_response")

    def test_invoke_end_to_end_mocked(self):
        """Verify full agent invocation flow with mocked services and strongly-typed GraphState."""
        mock_doc = FusedDocument(
            id="fused_1",
            document_id="doc_1",
            content="Grounded content for test",
            score=0.95,
            rrf_score=0.95,
        )
        self.mock_vector_service.search.return_value = []
        self.mock_sparse_service.search.return_value = []
        self.mock_rrf_service.fuse_results.return_value = [mock_doc]
        self.mock_groq_service.generate_synthesis.return_value = {
            "synthesized_response": "Synthesized grounded answer [Citation: doc_1, Page 1].",
            "citations": [{"document_id": "doc_1", "page": 1, "snippet": "Grounded content"}],
            "model_used": "test-model",
            "provider": "groq-test",
        }

        result = self.agent.invoke(
            query="test inquiry",
            tenant_id="tenant-xyz",
            top_k=3,
        )

        # Assert strongly-typed GraphState contract keys
        self.assertIn("query", result)
        self.assertIn("tenant_id", result)
        self.assertIn("retrieved_chunks", result)
        self.assertIn("relevance_grades", result)
        self.assertIn("rewrite_count", result)
        self.assertIn("final_answer", result)
        self.assertIn("execution_trace", result)

        # Assert values
        self.assertEqual(result["final_answer"], "Synthesized grounded answer [Citation: doc_1, Page 1].")
        self.assertEqual(result["final_response"], result["final_answer"])
        self.assertEqual(len(result["citations"]), 1)
        self.assertEqual(result["relevance_decision"], "relevant")
        self.assertEqual(result["rewrite_count"], 0)
        self.assertTrue(len(result["execution_trace"]) >= 3)

        self.mock_vector_service.search.assert_called_once()
        self.mock_sparse_service.search.assert_called_once()
        self.mock_rrf_service.fuse_results.assert_called_once()
        self.mock_groq_service.generate_synthesis.assert_called_once()

    def test_invoke_rewrite_loop_reaches_max_and_synthesizes(self):
        """Verify dynamic state graph execution executes query rewrite loop up to max 2 retries."""
        mock_doc = FusedDocument(
            id="fused_1",
            document_id="doc_1",
            content="Some ambiguous content",
            score=0.45,
            rrf_score=0.45,
        )
        self.mock_vector_service.search.return_value = []
        self.mock_sparse_service.search.return_value = []
        self.mock_rrf_service.fuse_results.return_value = [mock_doc]

        # Enable Groq with mock LLM responses
        self.mock_groq_service.is_configured.return_value = True

        # Mock LLM evaluation: always returns "irrelevant"
        eval_choice = MagicMock()
        eval_choice.message.content = "irrelevant"
        eval_choice.message.reasoning = None
        eval_completion = MagicMock()
        eval_completion.choices = [eval_choice]

        # Mock LLM rewriting: returns rewritten query
        rewrite_choice = MagicMock()
        rewrite_choice.message.content = "optimized keyword query"
        rewrite_choice.message.reasoning = None
        rewrite_completion = MagicMock()
        rewrite_completion.choices = [rewrite_choice]

        self.mock_groq_service.client.chat.completions.create.side_effect = [
            eval_completion,      # Eval #1 -> irrelevant
            rewrite_completion,   # Rewrite #1
            eval_completion,      # Eval #2 -> irrelevant
            rewrite_completion,   # Rewrite #2
            eval_completion,      # Eval #3 -> irrelevant, but rewrite_count=2 reached -> forces synthesis
        ]

        self.mock_groq_service.generate_synthesis.return_value = {
            "synthesized_response": "Exhausted retry synthesis answer [Citation: doc_1, Page 1].",
            "citations": [{"document_id": "doc_1", "page": 1, "snippet": "Some ambiguous content"}],
            "model_used": "test-model",
            "provider": "groq-test",
        }

        result = self.agent.invoke(
            query="hard query",
            tenant_id="tenant-retry",
            top_k=3,
        )

        self.assertEqual(result["rewrite_count"], 2)
        self.assertEqual(result["final_answer"], "Exhausted retry synthesis answer [Citation: doc_1, Page 1].")
        self.assertEqual(result["relevance_decision"], "irrelevant")

        # Verify trace steps logged every iteration of the state machine
        node_names_in_trace = [step["node"] for step in result["execution_trace"]]
        self.assertEqual(
            node_names_in_trace,
            [
                "retrieve_hybrid_context",
                "evaluate_context_relevance",
                "conditional_query_rewriter",
                "retrieve_hybrid_context",
                "evaluate_context_relevance",
                "conditional_query_rewriter",
                "retrieve_hybrid_context",
                "evaluate_context_relevance",
                "generate_verified_response",
            ],
        )


if __name__ == "__main__":
    unittest.main()
