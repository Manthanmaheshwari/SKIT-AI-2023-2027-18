#!/usr/bin/env python3
"""
Generator script to produce exactly 1,200 lines of highly complex, domain-specific
benchmark query-context pairs for testing dense and sparse search rankings.
"""

import json
import os
import sys

# Import base 55 benchmarks from scratch/generate_complex_benchmarks.py
sys.path.append(os.path.dirname(__file__))
from generate_complex_benchmarks import build_benchmarks as build_base_55

def build_all_60_benchmarks():
    base = build_base_55()
    
    # Base contains 52 queries from domains 1-9, plus 3 from domain 10
    # Let's split base into domains 1-9 (items 0..51) and domain 10 (items 52..54)
    dom1_to_8 = base[:48] # 48 items (6 queries x 8 domains)
    dom9 = base[48:52]    # 4 items (eval_query_fin_math_049..052)
    dom10 = base[52:]     # 3 items (eval_query_inf_math_053..055)
    
    # 2 new queries for Domain 9 (Financial Compliance & Sarbanes-Oxley Audit)
    fin_053 = {
        "query_id": "eval_query_fin_math_053",
        "query_text": "Wash sale identification under IRS Section 1091: Share lot bipartite matching with 30-day temporal replacement window t_buy in [t_sale - 30, t_sale + 30] and basis adjustment Basis_new = Cost_new + Loss_disallowed.",
        "domain": "Financial Compliance & Sarbanes-Oxley Audit",
        "mathematical_formulation": "Basis_{new} = Cost_{new} + Loss_{disallowed} \\quad \\text{where } t_{buy} \\in [t_{sale} - 30, t_{sale} + 30]",
        "expected_document_ids": [
            "doc_wash_sale_irs_sec1091_algorithms",
            "doc_financial_statement_merkle_audit",
            "doc_sox_internal_controls_audit"
        ],
        "dense_ranking_criteria": "Tax compliance graph algorithms, share lot matching, cost basis adjustment theory.",
        "sparse_ranking_criteria": "Tokens IRS Section 1091, wash sale, 30-day replacement window, Basis_new = Cost_new + Loss_disallowed.",
        "rrf_fusion_behavior": "Fuses statutory tax law requirements with algorithmic lot-matching graph specifications.",
        "context_passage": "Under IRC Section 1091, a wash sale occurs when an investor sells securities at a loss and within 30 days before or after buys substantially identical stock. The loss is disallowed for current tax deductions and added to the cost basis of the repurchased shares. Multi-lot transaction engines execute bipartite graph matching to pair loss sales with replacement lots within the 61-day window.",
        "retrieval_recall_score": 0.9100,
        "mean_reciprocal_rank_target": 0.9550
    }
    
    fin_054 = {
        "query_id": "eval_query_fin_math_054",
        "query_text": "Triangular foreign exchange arbitrage cycle detection in sparse liquidity matrices using Floyd-Warshall negative cycle detection: -ln(R_ij * R_jk * R_ki) < 0 across institutional FX order books.",
        "domain": "Financial Compliance & Sarbanes-Oxley Audit",
        "mathematical_formulation": "-\\ln(R_{ij} \\cdot R_{jk} \\cdot R_{ki}) < 0 \\implies R_{ij} \\cdot R_{jk} \\cdot R_{ki} > 1.0",
        "expected_document_ids": [
            "doc_fx_triangular_arbitrage_algorithms",
            "doc_sox_internal_controls_audit",
            "doc_financial_statement_merkle_audit"
        ],
        "dense_ranking_criteria": "Currency order book liquidity, graph negative cycle algorithms, high-frequency trading surveillance.",
        "sparse_ranking_criteria": "Tokens triangular arbitrage, Floyd-Warshall, negative cycle, -ln(R_ij * R_jk * R_ki), FX liquidity matrix.",
        "rrf_fusion_behavior": "Connects market microstructure graph theory with compliance trading abuse surveillance.",
        "context_passage": "Market manipulation and risk compliance systems monitor currency cross rates for unhedged triangular arbitrage exposure. Transforming exchange rate matrices via -ln(R) converts the multiplicative rate product into additive edge weights. Running Floyd-Warshall or Bellman-Ford flags directed cycles where total path weight is negative, revealing risk arbitrage loops.",
        "retrieval_recall_score": 0.8950,
        "mean_reciprocal_rank_target": 0.9400
    }
    
    dom9_complete = list(dom9) + [fin_053, fin_054]
    
    # 3 existing + 3 new queries for Domain 10 (LLM Inference Optimization & Fast Serving)
    # Renumber domain 10 query_ids cleanly from 055 to 060
    dom10_055 = dict(dom10[0])
    dom10_055["query_id"] = "eval_query_inf_math_055"
    
    dom10_056 = dict(dom10[1])
    dom10_056["query_id"] = "eval_query_inf_math_056"
    
    dom10_057 = dict(dom10[2])
    dom10_057["query_id"] = "eval_query_inf_math_057"
    
    dom10_058 = {
        "query_id": "eval_query_inf_math_058",
        "query_text": "Continuous batching iteration-level scheduling: Orca iteration step latency T_step = max_{i in B_t} T_decode(s_i) eliminating pipeline execution bubbles between prefill and decode phases.",
        "domain": "LLM Inference Optimization & Fast Serving",
        "mathematical_formulation": "T_{\\text{step}}(B_t) = \\max_{i \\in B_t} T_{\\text{decode}}(s_i) \\quad \\text{with dynamic admission at iteration boundary } t",
        "expected_document_ids": [
            "doc_orca_continuous_batching_osdi2022",
            "doc_paged_attention_vllm_kwon2023",
            "doc_groq_lpu_fast_inference"
        ],
        "dense_ranking_criteria": "Inference scheduling architectures, dynamic batching algorithms, GPU compute utilization.",
        "sparse_ranking_criteria": "Tokens continuous batching, Orca OSDI 2022, iteration-level scheduling, pipeline bubbles, T_step.",
        "rrf_fusion_behavior": "Synthesizes systems scheduling literature with high-throughput production serving metrics.",
        "context_passage": "Traditional deep learning frameworks batch requests at the sequence level, stalling fast-finishing requests until the longest sequence completes. Continuous batching (Yu et al., OSDI 2022) operates at the token-generation iteration level, dynamically evicting completed sequences and inserting new prefill prompts into batch B_t at each transformer forward pass step.",
        "retrieval_recall_score": 0.9300,
        "mean_reciprocal_rank_target": 0.9700
    }
    
    dom10_059 = {
        "query_id": "eval_query_inf_math_059",
        "query_text": "FlashAttention-3 FP8 forward pass tiling: Asynchronous Tensor Core warp specialization with online softmax numerical rescale factor m_new = max(m_prev, m_tilde) and l_new = l_prev * exp(m_prev - m_new) + l_tilde * exp(m_tilde - m_new).",
        "domain": "LLM Inference Optimization & Fast Serving",
        "mathematical_formulation": "m_{\\text{new}} = \\max(m_{\\text{prev}}, \\tilde{m}), \\quad l_{\\text{new}} = l_{\\text{prev}} e^{m_{\\text{prev}} - m_{\\text{new}}} + \\tilde{l} e^{\\tilde{m} - m_{\\text{new}}}",
        "expected_document_ids": [
            "doc_flashattention3_warp_specialization",
            "doc_paged_attention_vllm_kwon2023",
            "doc_speculative_decoding_acceleration"
        ],
        "dense_ranking_criteria": "Low-level GPU kernel optimization, tiling algorithms, numerical stability in FP8.",
        "sparse_ranking_criteria": "Tokens FlashAttention-3, FP8 forward pass, warp specialization, online softmax rescale, m_new, l_new.",
        "rrf_fusion_behavior": "Integrates CUDA kernel mechanics with mathematical attention stabilization formulas.",
        "context_passage": "FlashAttention-3 leverages Hopper H100 Tensor Core asynchronous TMA (Tensor Memory Accelerator) and warp specialization. By maintaining running maximums m and partition sums l in FP32 registers while performing matrix multiplications in FP8, it achieves 1.2 PFLOPS throughput (up to 75% hardware utilization) without SRAM buffer overflows.",
        "retrieval_recall_score": 0.9150,
        "mean_reciprocal_rank_target": 0.9600
    }
    
    dom10_060 = {
        "query_id": "eval_query_inf_math_060",
        "query_text": "Chunked prefill with piggyback decode scheduling: Chunk size C=512 with compute saturation bound sum_{i in B_prefill} min(L_i - O_i, C) <= C_budget preventing TTFT starvation during concurrent live RRF queries.",
        "domain": "LLM Inference Optimization & Fast Serving",
        "mathematical_formulation": "\\sum_{i \\in B_{\\text{prefill}}} \\min(L_i - O_i, C) \\le C_{\\text{budget}} \\quad (C = 512, \\; \\text{ITL} \\le 25\\text{ms})",
        "expected_document_ids": [
            "doc_chunked_prefill_piggyback_serving",
            "doc_paged_attention_vllm_kwon2023",
            "doc_groq_lpu_fast_inference"
        ],
        "dense_ranking_criteria": "Compute-bound vs memory-bound inference transitions, token latency constraints, SLA guarantees.",
        "sparse_ranking_criteria": "Tokens chunked prefill, piggyback decode, C=512, C_budget, TTFT starvation, ITL <= 25ms.",
        "rrf_fusion_behavior": "Links retrieval latency SLAs to server-side batch inference partitioning.",
        "context_passage": "Long context retrieval requests (e.g., 8,000 tokens) create severe compute spikes during prefill, stalling ongoing decode steps and violating Inter-Token Latency (ITL) SLAs. Chunked prefill breaks prompt ingestion into fixed chunks of C=512 tokens, co-scheduling prefill chunks alongside decode iterations to maximize Tensor Core utilization while bounding ITL to under 25ms.",
        "retrieval_recall_score": 0.9250,
        "mean_reciprocal_rank_target": 0.9650
    }
    
    dom10_complete = [dom10_055, dom10_056, dom10_057, dom10_058, dom10_059, dom10_060]
    
    all_60 = dom1_to_8 + dom9_complete + dom10_complete
    return all_60

if __name__ == '__main__':
    items = build_all_60_benchmarks()
    print(f"Constructed {len(items)} queries across 10 domains (6 queries per domain).")
