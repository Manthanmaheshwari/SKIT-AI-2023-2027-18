"""
Unit tests for LangGraphCRAGAgent.

Validates StateGraph compilation, state routing decisions, node execution,
and integration with vector, sparse, RRF, and Groq services.
"""

import unittest
from unittest.mock import MagicMock
from services.langgraph_rag_agent import LangGraphCRAGAgent, CRAGState
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

    def test_routing_logic_relevant(self):
        """Verify routing sends relevant decision to synthesize."""
        state: CRAGState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
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
        self.assertEqual(next_node, "synthesize")

    def test_routing_logic_retry_under_budget(self):
        """Verify ambiguous/irrelevant decision triggers rewrite_query when attempts < 2."""
        state: CRAGState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
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
        self.assertEqual(next_node, "rewrite_query")

    def test_routing_logic_exhausted_budget(self):
        """Verify routing forces synthesize when retrieval attempts reach limit."""
        state: CRAGState = {
            "query": "test query",
            "tenant_id": "test-tenant",
            "top_k": 5,
            "temperature": None,
            "max_tokens": None,
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
        self.assertEqual(next_node, "synthesize")

    def test_invoke_end_to_end_mocked(self):
        """Verify full agent invocation flow with mocked services."""
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

        self.assertIn("final_response", result)
        self.assertEqual(result["final_response"], "Synthesized grounded answer [Citation: doc_1, Page 1].")
        self.assertEqual(len(result["citations"]), 1)
        self.assertEqual(result["relevance_decision"], "relevant")
        self.mock_vector_service.search.assert_called_once()
        self.mock_sparse_service.search.assert_called_once()
        self.mock_rrf_service.fuse_results.assert_called_once()
        self.mock_groq_service.generate_synthesis.assert_called_once()


if __name__ == "__main__":
    unittest.main()

