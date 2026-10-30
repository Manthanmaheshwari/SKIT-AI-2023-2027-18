#!/usr/bin/env python3
"""
Dedicated Vector Retrieval Evaluation & RRF Benchmarking CLI.

Measures:
1. Retrieval Recall@K (proportion of ground-truth relevant documents retrieved in top-K)
2. Mean Reciprocal Rank (MRR) (inverse rank of first relevant retrieved document)
3. Precision@K, NDCG@K, and Mean Average Precision (MAP)
4. Ablation study: Dense Vector Search vs Sparse Lexical Search vs Reciprocal Rank Fusion
5. Parameter Sensitivity: RRF smoothing constant k sweeps across vector datasets

Outputs benchmark results in a clean, professional console table.

Usage:
    # Run full RRF evaluation benchmark across all vector datasets
    python benchmark_rrf_vector_datasets.py

    # Run with custom top-k and hyperparameter sensitivity sweep
    python benchmark_rrf_vector_datasets.py --top-k 5 --sweep

    # Run with export to JSON report
    python benchmark_rrf_vector_datasets.py --export benchmark_report.json

    # Run filtered to a specific vector domain category
    python benchmark_rrf_vector_datasets.py --domain "CRAG"
"""

import os
import sys
import json
import logging
import argparse
from typing import Any, Dict, List, Optional

# Ensure current and parent directories are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from services.evaluation_service import RetrievalEvaluationService


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configures structured console logging."""
    log_level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)

    return logging.getLogger("ai_service.rrf_benchmark")


def run_benchmark(
    dataset_path: Optional[str] = None,
    top_k: int = 5,
    rrf_k: int = 60,
    max_queries: Optional[int] = None,
    domain_filter: Optional[str] = None,
    tenant_id: str = "tenant_skit_ai_labs_prod",
    show_ablation: bool = True,
    run_sweep: bool = False,
    export_path: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
) -> Dict[str, Any]:
    """
    Executes the full RRF vector retrieval benchmark suite and prints the clean console table.
    """
    log = logger or logging.getLogger("ai_service.rrf_benchmark")

    # Resolve default dataset path if not specified
    if not dataset_path:
        default_candidates = [
            os.path.join(CURRENT_DIR, "retrieval_benchmark_dummy_datasets.json"),
            os.path.join(CURRENT_DIR, "evaluation_benchmarks.json"),
            os.path.join(CURRENT_DIR, "..", "retrieval_benchmark_dummy_datasets.json"),
        ]
        dataset_path = next((p for p in default_candidates if os.path.exists(p)), default_candidates[0])

    log.info("Initializing Retrieval Evaluation Service with dataset: '%s'", dataset_path)
    eval_service = RetrievalEvaluationService(dataset_path=dataset_path)

    log.info(
        "Executing RRF benchmark suite (top_k=%d, rrf_k=%d, tenant='%s', max_queries=%s)...",
        top_k,
        rrf_k,
        tenant_id,
        str(max_queries),
    )

    results = eval_service.run_benchmark_suite(
        top_k=top_k,
        rrf_k=rrf_k,
        max_queries=max_queries,
        domain_filter=domain_filter,
        tenant_id=tenant_id,
    )

    sweep_data = None
    if run_sweep:
        log.info("Executing RRF smoothing constant (k) sensitivity sweep [10, 20, 60, 100]...")
        sweep_data = eval_service.run_k_sensitivity_sweep(
            k_values=[10, 20, 60, 100],
            top_k=top_k,
            max_queries=max_queries,
        )
        results["sensitivity_sweep"] = sweep_data

    # Format and print the executive ASCII console table
    console_table = eval_service.format_ascii_table(
        summary_result=results,
        show_ablation=show_ablation,
        show_sensitivity=run_sweep,
        sensitivity_data=sweep_data,
    )
    print("\n" + console_table + "\n")

    # Export report if requested
    if export_path:
        log.info("Exporting structured evaluation metrics to '%s'...", export_path)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        log.info("Evaluation report successfully exported to %s", export_path)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Vector Retrieval Evaluation & Reciprocal Rank Fusion (RRF) Benchmark CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path to evaluation benchmark dataset JSON file.",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=5,
        help="Retrieval cutoff ceiling K for Recall@K (default: 5).",
    )
    parser.add_argument(
        "--rrf-k",
        type=int,
        default=60,
        help="Reciprocal Rank Fusion smoothing parameter constant (default: 60).",
    )
    parser.add_argument(
        "--max-queries",
        type=int,
        default=None,
        help="Limit number of benchmark queries evaluated.",
    )
    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        help="Filter benchmarks to a specific vector domain taxonomy category.",
    )
    parser.add_argument(
        "--tenant-id",
        type=str,
        default="tenant_skit_ai_labs_prod",
        help="Tenant boundary identifier (default: tenant_skit_ai_labs_prod).",
    )
    parser.add_argument(
        "--no-ablation",
        action="store_true",
        help="Disable dense vs sparse vs RRF ablation comparison table.",
    )
    parser.add_argument(
        "--sweep",
        action="store_true",
        help="Execute hyperparameter sensitivity sweep across RRF k constants [10, 20, 60, 100].",
    )
    parser.add_argument(
        "--export",
        type=str,
        default=None,
        help="Output path to export structured JSON benchmark report.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable detailed debug logging.",
    )

    args = parser.parse_args()
    logger = setup_logging(verbose=args.verbose)

    run_benchmark(
        dataset_path=args.dataset,
        top_k=args.top_k,
        rrf_k=args.rrf_k,
        max_queries=args.max_queries,
        domain_filter=args.domain,
        tenant_id=args.tenant_id,
        show_ablation=not args.no_ablation,
        run_sweep=args.sweep,
        export_path=args.export,
        logger=logger,
    )


if __name__ == "__main__":
    main()
