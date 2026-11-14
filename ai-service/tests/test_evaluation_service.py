"""
Unit tests for RetrievalEvaluationService.

Validates the mathematical calculation of Recall@K, Reciprocal Rank (RR),
Mean Reciprocal Rank (MRR), Precision@K, NDCG@K, Average Precision,
Reciprocal Rank Fusion (RRF) evaluation, ablation studies, and console table rendering.
"""

import os
import unittest
from services.evaluation_service import RetrievalEvaluationService


class TestRetrievalEvaluationService(unittest.TestCase):
    """Test suite for retrieval recall, MRR, and RRF evaluation algorithms."""

    def setUp(self):
        self.service = RetrievalEvaluationService()

    # -------------------------------------------------------------------------
    # Core Formula Tests
    # -------------------------------------------------------------------------

    def test_calculate_recall_at_k_exact_match(self):
        """Verify Recall@K calculation when all expected documents are in top-K."""
        retrieved = ["doc_1", "doc_2", "doc_3", "doc_4", "doc_5"]
        expected = ["doc_1", "doc_2", "doc_3"]
        recall = self.service.calculate_recall_at_k(retrieved, expected, k=3)
        self.assertEqual(recall, 1.0)

    def test_calculate_recall_at_k_partial_match(self):
        """Verify Recall@K with partial retrieval overlap."""
        retrieved = ["doc_1", "doc_x", "doc_2", "doc_y", "doc_z"]
        expected = ["doc_1", "doc_2", "doc_3", "doc_4"]
        # Retrieved within top 3: {"doc_1", "doc_2"} -> 2/4 = 0.50
        recall = self.service.calculate_recall_at_k(retrieved, expected, k=3)
        self.assertEqual(recall, 0.50)

    def test_calculate_recall_at_k_zero_match(self):
        """Verify Recall@K when no expected documents appear in top-K."""
        retrieved = ["doc_a", "doc_b", "doc_c"]
        expected = ["doc_1", "doc_2"]
        recall = self.service.calculate_recall_at_k(retrieved, expected, k=3)
        self.assertEqual(recall, 0.0)

    def test_calculate_recall_at_k_empty_expected(self):
        """Verify Recall@K handles empty ground truth gracefully."""
        recall = self.service.calculate_recall_at_k(["doc_1"], [], k=5)
        self.assertEqual(recall, 1.0)

    def test_calculate_reciprocal_rank_first_position(self):
        """Verify RR is 1.0 when the first retrieved candidate is relevant."""
        retrieved = ["doc_target", "doc_other_1", "doc_other_2"]
        expected = ["doc_target"]
        rr = self.service.calculate_reciprocal_rank(retrieved, expected)
        self.assertEqual(rr, 1.0)

    def test_calculate_reciprocal_rank_subsequent_position(self):
        """Verify RR calculation for 2nd and 3rd ranks."""
        retrieved = ["distractor", "doc_target_a", "doc_target_b"]
        expected = ["doc_target_a", "doc_target_b"]
        rr = self.service.calculate_reciprocal_rank(retrieved, expected)
        self.assertEqual(rr, 0.5)  # 1 / 2

        retrieved_3rd = ["distractor_1", "distractor_2", "doc_target_a"]
        rr_3rd = self.service.calculate_reciprocal_rank(retrieved_3rd, expected)
        self.assertAlmostEqual(rr_3rd, 0.3333, places=3)

    def test_calculate_reciprocal_rank_no_relevant_hit(self):
        """Verify RR is 0.0 when no expected document is retrieved."""
        retrieved = ["distractor_1", "distractor_2"]
        expected = ["doc_not_present"]
        rr = self.service.calculate_reciprocal_rank(retrieved, expected)
        self.assertEqual(rr, 0.0)

    def test_calculate_precision_at_k(self):
        """Verify Precision@K calculation."""
        retrieved = ["doc_1", "distractor", "doc_2", "distractor_2"]
        expected = ["doc_1", "doc_2"]
        prec_2 = self.service.calculate_precision_at_k(retrieved, expected, k=2)
        self.assertEqual(prec_2, 0.5)  # 1 relevant in top 2 -> 1/2 = 0.50

        prec_4 = self.service.calculate_precision_at_k(retrieved, expected, k=4)
        self.assertEqual(prec_4, 0.5)  # 2 relevant in top 4 -> 2/4 = 0.50

    def test_calculate_ndcg_at_k(self):
        """Verify NDCG@K binary gain calculation."""
        retrieved = ["doc_1", "doc_2", "distractor_1"]
        expected = ["doc_1", "doc_2"]
        # Perfect ordering: NDCG = 1.0
        ndcg_perf = self.service.calculate_ndcg_at_k(retrieved, expected, k=2)
        self.assertEqual(ndcg_perf, 1.0)

        # Inverted ordering: doc_2 at rank 2
        retrieved_inv = ["distractor_1", "doc_1"]
        ndcg_inv = self.service.calculate_ndcg_at_k(retrieved_inv, expected, k=2)
        self.assertGreater(ndcg_inv, 0.0)
        self.assertLess(ndcg_inv, 1.0)

    def test_calculate_average_precision(self):
        """Verify MAP / Average Precision calculation."""
        retrieved = ["doc_1", "distractor", "doc_2"]
        expected = ["doc_1", "doc_2"]
        # Precision at rank 1: 1/1 = 1.0; at rank 3: 2/3 = 0.6667 -> AP = (1.0 + 0.6667)/2 = 0.8333
        ap = self.service.calculate_average_precision(retrieved, expected, k=3)
        self.assertAlmostEqual(ap, 0.8333, places=3)

    # -------------------------------------------------------------------------
    # RRF Query Evaluation Tests
    # -------------------------------------------------------------------------

    def test_evaluate_query_with_rrf(self):
        """Verify that evaluate_query correctly executes Reciprocal Rank Fusion on candidate pools."""
        query_item = {
            "query_id": "test_q1",
            "query_text": "What is RRF?",
            "domain": "Reciprocal Rank Fusion",
            "expected_document_ids": ["doc_rel_1", "doc_rel_2"],
            "dense_candidates": [
                {"document_id": "doc_rel_1", "score": 0.95},
                {"document_id": "doc_distractor_d", "score": 0.85},
            ],
            "sparse_candidates": [
                {"document_id": "doc_rel_2", "score": 18.0},
                {"document_id": "doc_rel_1", "score": 14.0},
            ],
        }

        eval_res = self.service.evaluate_query(query_item, top_k=3, rrf_k=60)

        # doc_rel_1 appears in both (dense rank 1, sparse rank 2), so it must be top ranked by RRF
        self.assertEqual(eval_res["fused_document_ids"][0], "doc_rel_1")
        self.assertEqual(eval_res["reciprocal_rank"], 1.0)
        self.assertEqual(eval_res["recall_at_k"], 1.0)
        self.assertEqual(eval_res["dense_recall_at_k"], 0.5)  # Dense only had doc_rel_1
        self.assertEqual(eval_res["sparse_recall_at_k"], 1.0)  # Sparse had both

    # -------------------------------------------------------------------------
    # Benchmark Suite & Ablation Tests
    # -------------------------------------------------------------------------

    def test_run_benchmark_suite_execution(self):
        """Verify full benchmark suite runs over dataset with valid global metrics and ablation."""
        summary = self.service.run_benchmark_suite(top_k=5, max_queries=15)

        self.assertEqual(summary["status"], "COMPLETED")
        self.assertEqual(summary["total_queries_evaluated"], 15)
        self.assertEqual(summary["top_k"], 5)

        gm = summary["global_metrics"]
        self.assertGreaterEqual(gm["mean_recall_at_k"], 0.60)
        self.assertGreaterEqual(gm["mean_reciprocal_rank"], 0.70)

        # Ablation check
        self.assertIn("ablation_comparison", summary)
        ablation = summary["ablation_comparison"]
        self.assertIn("dense_vector_search", ablation)
        self.assertIn("sparse_lexical_search", ablation)
        self.assertIn("reciprocal_rank_fusion", ablation)
        # RRF recall should equal or exceed individual retrievers
        self.assertGreaterEqual(
            ablation["reciprocal_rank_fusion"]["mean_recall_at_k"],
            ablation["dense_vector_search"]["mean_recall_at_k"] * 0.95,
        )

        # Domain breakdown check
        self.assertIn("domain_breakdown", summary)
        self.assertGreater(len(summary["domain_breakdown"]), 0)

    def test_run_k_sensitivity_sweep(self):
        """Verify parameter sensitivity sweep over RRF smoothing constant k."""
        sweep = self.service.run_k_sensitivity_sweep(k_values=[10, 60], top_k=5, max_queries=5)
        self.assertEqual(len(sweep), 2)
        self.assertEqual(sweep[0]["k"], 10)
        self.assertEqual(sweep[1]["k"], 60)
        self.assertGreater(sweep[1]["mean_recall_at_k"], 0.0)

    # -------------------------------------------------------------------------
    # Console Table Output Test
    # -------------------------------------------------------------------------

    def test_format_ascii_table(self):
        """Verify ASCII console table generator produces clean, non-empty, well-aligned table."""
        summary = self.service.run_benchmark_suite(top_k=5, max_queries=5)
        table = self.service.format_ascii_table(summary, show_ablation=True)
        self.assertIn("ENTERPRISE VECTOR RETRIEVAL BENCHMARK REPORT", table)
        self.assertIn("Mean Retrieval Recall@5", table)
        self.assertIn("Mean Reciprocal Rank (MRR)", table)
        self.assertIn("RETRIEVAL STRATEGY ABLATION COMPARISON", table)
        self.assertIn("Dense Vector Search", table)
        self.assertIn("Sparse Lexical Search", table)
        self.assertIn("Reciprocal Rank Fusion", table)


if __name__ == "__main__":
    unittest.main()
