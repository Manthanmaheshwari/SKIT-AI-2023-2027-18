#!/usr/bin/env python3
"""
Standalone Retrieval Evaluation & End-to-End RAG Demonstration Script.

Enterprise CLI tool for:
1. Executing rigorous Recall@K and Mean Reciprocal Rank (MRR) benchmarks across evaluation datasets.
2. Demonstrating the complete, end-to-end RAG pipeline with Groq API fast inference generation.

Usage:
    # Run full retrieval benchmark suite
    python evaluation_benchmark.py

    # Run with custom top-k and JSON export
    python evaluation_benchmark.py --top-k 5 --export benchmark_report.json

    # Run end-to-end RAG synthesis demo with Groq API
    python evaluation_benchmark.py --demo-rag --query "How does CRAG optimize hallucination rates in multi-agent clusters?"
"""

import os
import sys
import json
import logging
import argparse
from typing import Any, Dict, List

# Ensure parent and current directory are on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from services.evaluation_service import RetrievalEvaluationService
from services.groq_service import GroqGenerationService
from services.rrf_service import ReciprocalRankFusionService, RankedDocument


# =========================================================================
# Logging Configuration
# =========================================================================
def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configures structured, enterprise-grade logging for console output."""
    log_level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    # Remove existing handlers to avoid duplicates
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)

    return logging.getLogger("ai_service.benchmark_cli")


def run_evaluation(
    dataset_path: str,
    top_k: int = 5,
    rrf_k: int = 60,
    max_queries: int = None,
    domain_filter: str = None,
    export_path: str = None,
    tenant_id: str = "tenant_skit_ai_labs_prod",
    show_ablation: bool = True,
    run_sweep: bool = False,
    logger: logging.Logger = None,
) -> Dict[str, Any]:
    """
    Executes the benchmark evaluation engine and prints structured results.
    """
    logger.info("Initializing Retrieval Evaluation Service (dataset='%s')...", dataset_path)
    eval_service = RetrievalEvaluationService(dataset_path=dataset_path)

    results = eval_service.run_benchmark_suite(
        top_k=top_k,
        rrf_k=rrf_k,
        max_queries=max_queries,
        domain_filter=domain_filter,
        tenant_id=tenant_id,
    )

    sweep_data = None
    if run_sweep:
        logger.info("Running RRF smoothing constant (k) sensitivity sweep [10, 20, 60, 100]...")
        sweep_data = eval_service.run_k_sensitivity_sweep(
            k_values=[10, 20, 60, 100],
            top_k=top_k,
            max_queries=max_queries,
        )
        results["sensitivity_sweep"] = sweep_data

    # Print executive ASCII terminal report
    report_table = eval_service.format_ascii_table(
        summary_result=results,
        show_ablation=show_ablation,
        show_sensitivity=run_sweep,
        sensitivity_data=sweep_data,
    )
    print("\n" + report_table + "\n")

    if export_path:
        logger.info("Exporting structured evaluation metrics to '%s'...", export_path)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        logger.info("Report exported successfully to %s", export_path)

    return results


def run_rag_demo(
    query: str,
    tenant_id: str = "skit-ai-labs",
    top_k: int = 4,
    logger: logging.Logger = None,
) -> Dict[str, Any]:
    """
    Demonstrates the end-to-end RAG pipeline:
    1. Hybrid Search candidate aggregation
    2. Reciprocal Rank Fusion (RRF) scoring
    3. Groq API inference for visual citation grounded synthesis
    """
    logger.info("=" * 80)
    logger.info("EXECUTING END-TO-END RAG PIPELINE DEMONSTRATION")
    logger.info("=" * 80)
    logger.info("Query: '%s'", query)
    logger.info("Tenant Scope: '%s' | Top-K: %d", tenant_id, top_k)

    # 1. Simulate dense & sparse candidate retrieval for the demonstration query
    dense_candidates = [
        RankedDocument(
            id="doc_rag_supplement_007",
            document_id="doc_rag_supplement_007",
            chunk_id="chunk_001",
            content="Corrective Retrieval-Augmented Generation (CRAG) evaluates context confidence (default: 0.82) using LangGraph state machines to dynamically trigger query rewriting or refuse unsupported assertions.",
            score=0.962,
            source="chromadb_dense",
            metadata={"page": 1, "section": "1.1 CRAG Architecture"},
        ),
        RankedDocument(
            id="doc_vector_supplement_007",
            document_id="doc_vector_supplement_007",
            chunk_id="chunk_002",
            content="Reciprocal Rank Fusion with smoothing parameter k=60 robustly normalizes asymmetric dense ChromaDB cosine similarity metrics with sparse Rank-BM25 term frequency scores.",
            score=0.914,
            source="chromadb_dense",
            metadata={"page": 1, "section": "1.2 Hybrid RRF"},
        ),
        RankedDocument(
            id="doc_tenant_isolation_row_level_security",
            document_id="doc_tenant_isolation_row_level_security",
            chunk_id="chunk_003",
            content="Multi-tenant isolation boundaries are guaranteed by compiling WHERE TenantId = @CurrentTenantId into EF Core SQL expressions and metadata tags in ChromaDB collections.",
            score=0.885,
            source="chromadb_dense",
            metadata={"page": 2, "section": "2.1 Security Boundary"},
        ),
    ]

    sparse_candidates = [
        RankedDocument(
            id="doc_rag_supplement_007",
            document_id="doc_rag_supplement_007",
            chunk_id="chunk_001",
            content="Corrective Retrieval-Augmented Generation (CRAG) evaluates context confidence (default: 0.82) using LangGraph state machines to dynamically trigger query rewriting or refuse unsupported assertions.",
            score=14.82,
            source="bm25_sparse",
            metadata={"page": 1, "section": "1.1 CRAG Architecture"},
        ),
        RankedDocument(
            id="doc_sparse_supplement_007",
            document_id="doc_sparse_supplement_007",
            chunk_id="chunk_004",
            content="BM25 Okapi inverted index construction provides exact-match keyword recall for alphanumeric identifiers, tenant keys, and cryptographic hashes.",
            score=11.20,
            source="bm25_sparse",
            metadata={"page": 2, "section": "2.3 Lexical Inverted Index"},
        ),
    ]

    # 2. Reciprocal Rank Fusion
    rrf_engine = ReciprocalRankFusionService(k=60)
    logger.info("Executing Reciprocal Rank Fusion (k=60) across dense and sparse candidate pools...")
    fused_results = rrf_engine.fuse_results(
        dense_results=dense_candidates,
        sparse_results=sparse_candidates,
        top_k=top_k,
    )

    logger.info("Fused candidate pool generated (%d documents re-ranked):", len(fused_results))
    for idx, fdoc in enumerate(fused_results, start=1):
        sources = [s for s, r in [('ChromaDB Dense', fdoc.dense_rank), ('BM25 Sparse', fdoc.sparse_rank)] if r is not None]
        logger.info(
            "  [%d] ID: %s | RRF Score: %.6f | Sources: %s",
            idx,
            fdoc.document_id,
            fdoc.score,
            ", ".join(sources) if sources else "fused",
        )

    # 3. Groq LLM Generation
    groq_service = GroqGenerationService()
    logger.info("Invoking Groq API for grounded answer synthesis (Model: %s)...", groq_service.model)

    synthesis_result = groq_service.generate_synthesis(
        query=query,
        context_documents=fused_results,
        tenant_id=tenant_id,
    )

    print("\n" + "=" * 80)
    print("  GROQ API SYNTHESIZED RESPONSE (GROUNDED WITH VISUAL CITATIONS)")
    print("=" * 80)
    print(f"Model:    {synthesis_result.get('model_used')}")
    print(f"Provider: {synthesis_result.get('provider')}")
    print(f"Latency:  {synthesis_result.get('latency_ms')}ms")
    usage = synthesis_result.get("usage", {})
    print(f"Tokens:   Prompt: {usage.get('prompt_tokens', 0)} | Completion: {usage.get('completion_tokens', 0)} | Total: {usage.get('total_tokens', 0)}")
    print("-" * 80)
    print(synthesis_result.get("synthesized_response"))
    print("-" * 80)
    print("EXTRACTED VISUAL CITATIONS:")
    for cit in synthesis_result.get("citations", []):
        print(f"  * Document: {cit['document_id']} | Page: {cit.get('page', 1)} | Score: {cit.get('score', 0.9):.2f}")
        print(f"    Snippet: \"{cit.get('snippet', '')}\"")
    print("=" * 80 + "\n")

    return synthesis_result


def main():
    parser = argparse.ArgumentParser(
        description="Enterprise AI Evaluation Benchmarks & Groq RAG Synthesis CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    default_dataset = os.path.join(CURRENT_DIR, "retrieval_benchmark_dummy_datasets.json")
    if not os.path.exists(default_dataset):
        default_dataset = os.path.join(CURRENT_DIR, "evaluation_benchmarks.json")

    parser.add_argument(
        "--dataset",
        type=str,
        default=default_dataset,
        help="Path to evaluation benchmarks JSON dataset.",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=5,
        help="Retrieval cutoff ceiling for Recall@K (default: 5).",
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
        help="Limit the number of benchmark queries evaluated (optional).",
    )
    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        help="Filter benchmarks by vector dataset / domain category substring.",
    )
    parser.add_argument(
        "--sweep",
        action="store_true",
        help="Execute hyperparameter sensitivity sweep across RRF smoothing constants [10, 20, 60, 100].",
    )
    parser.add_argument(
        "--no-ablation",
        action="store_true",
        help="Disable dense vs sparse vs RRF ablation comparison table.",
    )
    parser.add_argument(
        "--export",
        type=str,
        default=None,
        help="Output path to export structured JSON benchmark report.",
    )
    parser.add_argument(
        "--tenant-id",
        type=str,
        default="tenant_skit_ai_labs_prod",
        help="Tenant boundary identifier (default: tenant_skit_ai_labs_prod).",
    )
    parser.add_argument(
        "--demo-rag",
        action="store_true",
        help="Execute an end-to-end RAG pipeline demonstration using Groq API.",
    )
    parser.add_argument(
        "--query",
        type=str,
        default="How does Corrective RAG (CRAG) state evaluator optimize hallucination rates in distributed multi-agent synthesis clusters?",
        help="User inquiry to synthesize during RAG demo.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable detailed debug logging.",
    )

    args = parser.parse_args()
    logger = setup_logging(verbose=args.verbose)

    # 1. Execute Retrieval Evaluation Benchmarks
    run_evaluation(
        dataset_path=args.dataset,
        top_k=args.top_k,
        rrf_k=args.rrf_k,
        max_queries=args.max_queries,
        domain_filter=args.domain,
        export_path=args.export,
        tenant_id=args.tenant_id,
        show_ablation=not args.no_ablation,
        run_sweep=args.sweep,
        logger=logger,
    )

    # 2. If requested, demonstrate the End-to-End Groq RAG Pipeline
    if args.demo_rag:
        run_rag_demo(
            query=args.query,
            tenant_id=args.tenant_id,
            top_k=args.top_k,
            logger=logger,
        )


if __name__ == "__main__":
    main()
