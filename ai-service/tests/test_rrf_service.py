"""
Unit tests for the Reciprocal Rank Fusion (RRF) service.
"""

import unittest
from services.rrf_service import (
    FusedDocument,
    RankedDocument,
    ReciprocalRankFusionService,
    fuse_rankings,
    reciprocal_rank_fusion,
)


class TestReciprocalRankFusion(unittest.TestCase):
    """
    Test suite for validating the RRF algorithm, Pydantic type hinting,
    normalization, and ranking mechanics.
    """

    def setUp(self):
        self.k_default = 60
        self.dense_sample = [
            {
                "chunk_id": "chunk_alpha",
                "document_id": "doc_101",
                "content": "Deep learning architectures and transformer attention mechanisms.",
                "score": 0.92,
                "metadata": {"tenant_id": "tenant_a", "page": 1, "domain": "neural_nets"},
            },
            {
                "chunk_id": "chunk_beta",
                "document_id": "doc_102",
                "content": "Sparse lexical matching utilizing BM25 Okapi term saturation.",
                "score": 0.81,
                "metadata": {"tenant_id": "tenant_a", "page": 4},
            },
            {
                "chunk_id": "chunk_gamma",
                "document_id": "doc_103",
                "content": "Corrective RAG verification loops and hallucination grading.",
                "score": 0.75,
                "metadata": {"tenant_id": "tenant_a", "page": 8},
            },
        ]

        self.sparse_sample = [
            {
                "chunk_id": "chunk_beta",
                "document_id": "doc_102",
                "content": "Sparse lexical matching utilizing BM25 Okapi term saturation.",
                "score": 14.8,
                "metadata": {"tenant_id": "tenant_a", "section": "retrieval"},
            },
            {
                "chunk_id": "chunk_delta",
                "document_id": "doc_104",
                "content": "Multi-tenant tenant isolation through row-level and vector filtering.",
                "score": 11.2,
                "metadata": {"tenant_id": "tenant_a", "page": 2},
            },
            {
                "chunk_id": "chunk_alpha",
                "document_id": "doc_101",
                "content": "Deep learning architectures and transformer attention mechanisms.",
                "score": 9.4,
                "metadata": {"tenant_id": "tenant_a", "author": "researcher"},
            },
        ]

    def test_rrf_mathematical_formula_default_k(self):
        """
        Verify that score = 1 / (k + rank) is mathematically exact.
        For k=60:
          - Rank 1 score delta = 1 / (60 + 1) = 1 / 61 = 0.0163934426...
          - Rank 2 score delta = 1 / (60 + 2) = 1 / 62 = 0.0161290322...
          - Rank 3 score delta = 1 / (60 + 3) = 1 / 63 = 0.0158730158...
        """
        results = reciprocal_rank_fusion(
            dense_results=self.dense_sample,
            sparse_results=self.sparse_sample,
            k=60,
        )

        # Expected scores:
        # chunk_beta:  dense rank 2 (1/62) + sparse rank 1 (1/61) = 0.016129032 + 0.016393443 = 0.03252247
        # chunk_alpha: dense rank 1 (1/61) + sparse rank 3 (1/63) = 0.016393443 + 0.015873016 = 0.03226646
        # chunk_delta: sparse rank 2 (1/62) = 0.016129032
        # chunk_gamma: dense rank 3 (1/63) = 0.015873016
        self.assertEqual(len(results), 4)

        # First place must be chunk_beta
        self.assertEqual(results[0].chunk_id, "chunk_beta")
        expected_beta_score = (1.0 / 62.0) + (1.0 / 61.0)
        self.assertAlmostEqual(results[0].score, expected_beta_score, places=6)
        self.assertAlmostEqual(results[0].rrf_score, expected_beta_score, places=6)
        self.assertEqual(results[0].dense_rank, 2)
        self.assertEqual(results[0].sparse_rank, 1)

        # Second place must be chunk_alpha
        self.assertEqual(results[1].chunk_id, "chunk_alpha")
        expected_alpha_score = (1.0 / 61.0) + (1.0 / 63.0)
        self.assertAlmostEqual(results[1].score, expected_alpha_score, places=6)
        self.assertEqual(results[1].dense_rank, 1)
        self.assertEqual(results[1].sparse_rank, 3)

        # Third place must be chunk_delta
        self.assertEqual(results[2].chunk_id, "chunk_delta")
        expected_delta_score = 1.0 / 62.0
        self.assertAlmostEqual(results[2].score, expected_delta_score, places=6)
        self.assertIsNone(results[2].dense_rank)
        self.assertEqual(results[2].sparse_rank, 2)

        # Fourth place must be chunk_gamma
        self.assertEqual(results[3].chunk_id, "chunk_gamma")
        expected_gamma_score = 1.0 / 63.0
        self.assertAlmostEqual(results[3].score, expected_gamma_score, places=6)
        self.assertEqual(results[3].dense_rank, 3)
        self.assertIsNone(results[3].sparse_rank)

    def test_custom_k_parameter(self):
        """
        Verify RRF with a custom k parameter (e.g., k=20).
        """
        results = reciprocal_rank_fusion(
            dense_results=self.dense_sample,
            sparse_results=self.sparse_sample,
            k=20,
        )

        expected_beta_score = (1.0 / (20 + 2)) + (1.0 / (20 + 1))
        self.assertEqual(results[0].chunk_id, "chunk_beta")
        self.assertAlmostEqual(results[0].score, expected_beta_score, places=6)

    def test_top_k_limiting(self):
        """
        Verify that top_k correctly limits the output size.
        """
        results = reciprocal_rank_fusion(
            dense_results=self.dense_sample,
            sparse_results=self.sparse_sample,
            top_k=2,
        )
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].chunk_id, "chunk_beta")
        self.assertEqual(results[1].chunk_id, "chunk_alpha")

    def test_invalid_parameters_raise_value_errors(self):
        """
        Verify that non-positive k or top_k values raise appropriate ValueErrors.
        """
        with self.assertRaises(ValueError):
            reciprocal_rank_fusion(self.dense_sample, self.sparse_sample, k=0)

        with self.assertRaises(ValueError):
            reciprocal_rank_fusion(self.dense_sample, self.sparse_sample, k=-10)

        with self.assertRaises(ValueError):
            reciprocal_rank_fusion(self.dense_sample, self.sparse_sample, top_k=0)

        with self.assertRaises(ValueError):
            reciprocal_rank_fusion(self.dense_sample, self.sparse_sample, top_k=-5)

    def test_empty_lists_handling(self):
        """
        Verify handling when one or both input lists are empty.
        """
        # Both empty
        self.assertEqual(reciprocal_rank_fusion([], []), [])

        # Dense empty
        sparse_only = reciprocal_rank_fusion([], self.sparse_sample, k=60)
        self.assertEqual(len(sparse_only), 3)
        self.assertEqual(sparse_only[0].chunk_id, "chunk_beta")
        self.assertAlmostEqual(sparse_only[0].score, 1.0 / 61.0, places=6)

        # Sparse empty
        dense_only = reciprocal_rank_fusion(self.dense_sample, [], k=60)
        self.assertEqual(len(dense_only), 3)
        self.assertEqual(dense_only[0].chunk_id, "chunk_alpha")
        self.assertAlmostEqual(dense_only[0].score, 1.0 / 61.0, places=6)

    def test_duplicate_handling_within_same_retriever(self):
        """
        Verify that if a retriever returns duplicates, only the best (first)
        rank is counted and score is not artificially multiplied.
        """
        duplicated_dense = [
            {"chunk_id": "chunk_x", "content": "Sample content X"},
            {"chunk_id": "chunk_x", "content": "Sample content X duplicate"},
        ]
        results = reciprocal_rank_fusion(duplicated_dense, [], k=60)
        self.assertEqual(len(results), 1)
        self.assertAlmostEqual(results[0].score, 1.0 / 61.0, places=6)

    def test_metadata_merging_and_isolation(self):
        """
        Verify that metadata from both retrieval sources is merged cleanly,
        preserving isolation attributes like tenant_id.
        """
        results = reciprocal_rank_fusion(
            dense_results=self.dense_sample,
            sparse_results=self.sparse_sample,
        )

        # chunk_beta should have both 'page': 4 (from dense) and 'section': 'retrieval' (from sparse)
        beta_doc = next(d for d in results if d.chunk_id == "chunk_beta")
        self.assertEqual(beta_doc.metadata.get("tenant_id"), "tenant_a")
        self.assertEqual(beta_doc.metadata.get("page"), 4)
        self.assertEqual(beta_doc.metadata.get("section"), "retrieval")

    def test_alternative_content_keys_and_hash_fallback(self):
        """
        Verify that 'page_content' / 'text' / 'document' keys are parsed,
        and fallback content hashes are generated when no ID is provided.
        """
        custom_docs = [
            {"page_content": "LangChain styled text", "score": 0.88},
            {"text": "Generic text property", "id": "explicit_id_1"},
        ]
        results = reciprocal_rank_fusion(custom_docs, [], k=60)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].content, "LangChain styled text")
        self.assertTrue(len(results[0].id) > 0)
        self.assertEqual(results[1].id, "explicit_id_1")

    def test_pydantic_model_input_and_dict_subscripting(self):
        """
        Verify that RankedDocument instances can be passed directly,
        and FusedDocument supports dict subscripting (doc['score']).
        """
        ranked_dense = [
            RankedDocument(
                chunk_id="chunk_typed",
                content="Strongly typed Pydantic content.",
                score=0.99,
                metadata={"tenant_id": "tenant_x"},
            )
        ]
        results = reciprocal_rank_fusion(ranked_dense, [])
        self.assertEqual(len(results), 1)
        doc = results[0]

        # Pydantic attribute access
        self.assertEqual(doc.chunk_id, "chunk_typed")
        self.assertAlmostEqual(doc.score, 1.0 / 61.0, places=6)

        # Dict subscription access
        self.assertAlmostEqual(doc["score"], 1.0 / 61.0, places=6)
        self.assertEqual(doc["tenant_id"], "tenant_x")
        self.assertIn("score", doc)
        self.assertEqual(doc.get("chunk_id"), "chunk_typed")

    def test_service_class_integration(self):
        """
        Verify that ReciprocalRankFusionService class wraps reciprocal_rank_fusion properly.
        """
        service = ReciprocalRankFusionService(k=60)
        fused = service.fuse_results(
            dense_results=self.dense_sample,
            sparse_results=self.sparse_sample,
            top_k=3,
        )
        self.assertEqual(len(fused), 3)
        self.assertEqual(fused[0].chunk_id, "chunk_beta")
        self.assertEqual(fuse_rankings, reciprocal_rank_fusion)


if __name__ == "__main__":
    unittest.main()
