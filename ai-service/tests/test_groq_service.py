"""
Unit tests for GroqGenerationService.

Validates prompt assembly, context serialization, visual citation parsing,
and deterministic fallback answer generation for offline environments.
"""

import os
import unittest
from services.groq_service import GroqGenerationService


class TestGroqGenerationService(unittest.TestCase):
    """Test suite for Groq generation and visual citation grounding."""

    def setUp(self):
        # Initialize with simulated/offline configuration to verify deterministic grounding
        self.service = GroqGenerationService(api_key="", model="llama-3.3-70b-versatile")

    def test_initialization_defaults(self):
        """Verify service initializes with expected model and parameters."""
        self.assertEqual(self.service.model, "llama-3.3-70b-versatile")
        self.assertFalse(self.service.is_configured())

    def test_format_context_block(self):
        """Verify heterogeneous context documents are formatted with page and score metadata."""
        mock_docs = [
            {
                "id": "doc_crag_01",
                "document_id": "doc_crag_01",
                "content": "LangGraph state machine evaluates retrieved context sufficiency.",
                "score": 0.942,
                "metadata": {"page": 3},
            },
            {
                "id": "doc_rrf_02",
                "document_id": "doc_rrf_02",
                "content": "Reciprocal rank fusion consolidates dense and sparse rankings.",
                "score": 0.887,
                "metadata": {"page": 1},
            },
        ]

        context_str, references = self.service._format_context_block(mock_docs)
        self.assertIn("[Document #1 | ID: doc_crag_01 | Page: 3 | Score: 0.9420]", context_str)
        self.assertIn("LangGraph state machine evaluates", context_str)
        self.assertEqual(len(references), 2)
        self.assertEqual(references[0]["document_id"], "doc_crag_01")
        self.assertEqual(references[0]["page"], 3)

    def test_extract_citations(self):
        """Verify regex extraction of visual citation tags."""
        sample_text = (
            "CRAG mitigates hallucinations via iterative verification [Citation: doc_rag_007, Page 2]. "
            "BM25 provides exact keyword recall [Citation: doc_bm25_001, Page 4]."
        )
        references = [
            {"document_id": "doc_rag_007", "page": 2, "snippet": "CRAG context verification.", "score": 0.95},
            {"document_id": "doc_bm25_001", "page": 4, "snippet": "BM25 inverted index.", "score": 0.89},
        ]

        citations = self.service._extract_citations(sample_text, references)
        self.assertEqual(len(citations), 2)
        self.assertEqual(citations[0]["document_id"], "doc_rag_007")
        self.assertEqual(citations[0]["page"], 2)
        self.assertEqual(citations[1]["document_id"], "doc_bm25_001")
        self.assertEqual(citations[1]["page"], 4)

    def test_fallback_synthesis_generation(self):
        """Verify deterministic fallback generates grounded response with citations."""
        mock_docs = [
            {
                "id": "doc_sample_101",
                "document_id": "doc_sample_101",
                "content": "Zero-trust tenant isolation compiles WHERE filters into SQL queries.",
                "score": 0.96,
                "metadata": {"page": 1},
            }
        ]

        result = self.service.generate_synthesis(
            query="How does zero-trust tenant isolation work?",
            context_documents=mock_docs,
            tenant_id="skit-ai-labs",
        )

        self.assertIn("synthesized_response", result)
        self.assertIn("citations", result)
        self.assertGreater(len(result["citations"]), 0)
        self.assertEqual(result["citations"][0]["document_id"], "doc_sample_101")
        self.assertIn("doc_sample_101", result["synthesized_response"])
        self.assertIn("latency_ms", result)
        self.assertIn("usage", result)


if __name__ == "__main__":
    unittest.main()
