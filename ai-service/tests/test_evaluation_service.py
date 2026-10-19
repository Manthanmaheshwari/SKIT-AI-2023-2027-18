"""
Unit tests for RetrievalEvaluationService.

Validates the mathematical calculation of Recall@K, Reciprocal Rank (RR),
Mean Reciprocal Rank (MRR), Precision@K, and domain-level benchmark aggregation.
"""

import os
import unittest
from services.evaluation_service import RetrievalEvaluationService


class TestRetrievalEvaluationService(unittest.TestCase):
    """Test suite for retrieval recall and MRR evaluation algorithms."""

    def setUp(self):
        self.service = RetrievalEvaluationService()

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

    def test_run_benchmark_suite_execution(self):
        """Verify full benchmark suite runs over dataset with valid global metrics."""
        summary = self.service.run_benchmark_suite(top_k=5, max_queries=15)

        self.assertEqual(summary["status"], "COMPLETED")
        self.assertEqual(summary["total_queries_evaluated"], 15)
        self.assertEqual(summary["top_k"], 5)

        gm = summary["global_metrics"]
        self.assertGreaterEqual(gm["mean_recall_at_k"], 0.70)
        self.assertGreaterEqual(gm["mean_reciprocal_rank"], 0.70)
        self.assertGreaterEqual(gm["sla_target_compliance_rate_percent"], 80.0)

        # Domain breakdown check
        self.assertIn("domain_breakdown", summary)
        self.assertGreater(len(summary["domain_breakdown"]), 0)

    def test_format_ascii_table(self):
        """Verify ASCII report generator produces clean non-empty string."""
        summary = self.service.run_benchmark_suite(top_k=5, max_queries=5)
        table = self.service.format_ascii_table(summary)
        self.assertIn("ENTERPRISE RETRIEVAL EVALUATION BENCHMARK REPORT", table)
        self.assertIn("Mean Recall@5", table)
        self.assertIn("Mean Reciprocal Rank (MRR)", table)


if __name__ == "__main__":
    unittest.main()
