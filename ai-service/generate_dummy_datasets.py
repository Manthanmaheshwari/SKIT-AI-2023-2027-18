#!/usr/bin/env python3
"""
Generator script to produce a massive enterprise-grade retrieval benchmark simulation dataset:
`retrieval_benchmark_dummy_datasets.json`.

Produces 150 diverse, high-fidelity mock evaluation records containing:
- Simulation batch & execution telemetry
- Comprehensive query logs with domain taxonomy
- Retrieval parameters (Dense, BM25 sparse, RRF fusion)
- Ground truth documents vs retrieved documents
- Precision metrics (Recall@K, Reciprocal Rank, Precision@K, NDCG@K, SLA compliance)
- Fine-grained timing and memory telemetry
"""

import json
import random
import datetime

# Seed for reproducible high-quality distribution
random.seed(42)

DOMAINS = [
    {
        "domain": "CRAG & Multi-Agent RAG Architecture",
        "tenant_id": "tenant_skit_ai_labs_prod",
        "doc_prefix": "doc_crag_",
        "topics": [
            "Corrective RAG state evaluator triggering web fallback when retrieval confidence drops below threshold",
            "Multi-agent consensus routing under conflicting document evidence in distributed clusters",
            "Self-reflective query decomposition and iterative refinement for hallucination mitigation",
            "Dynamic threshold calibration for ambiguity detection in zero-shot retrieval pipelines",
            "CRAG document grading heuristics using cross-encoder confidence intervals",
            "Asynchronous speculative decoding with grounded retrieval verification loops",
            "Graph-guided state transitions in hierarchical retrieval-augmented planning agents",
            "Failure mode analysis of CRAG fallback under adversarial ungrounded injection queries",
            "Quantifying hallucination rate reduction across RAG triad metrics in enterprise workloads",
            "Adaptive query rewriting strategies when lexical sparse recall fails against acronyms",
            "Multi-hop reasoning path validation across multi-document chunk dependency DAGs",
            "Benchmarking CRAG latency overhead versus naive single-pass RAG architectures",
        ],
    },
    {
        "domain": "Vector Databases & HNSW Indexing",
        "tenant_id": "tenant_vector_ops_core",
        "doc_prefix": "doc_hnsw_",
        "topics": [
            "HNSW graph connectivity parameter M and efConstruction trade-offs in billion-scale vector indexes",
            "Quantization degradation: Scalar SQ8 vs Product Quantization PQ32 recall at cosine distance",
            "Memory footprint optimization for memory-mapped HNSW flat vectors on NVMe storage",
            "Dynamic filtering in Milvus and ChromaDB: Pre-filtering versus single-stage iterative filtering",
            "Distributed index rebalancing and shard migration under streaming embedding ingestion spikes",
            "GPU-accelerated vector search indexing using IVF-PQ with inverted list centroids",
            "Dimensionality reduction effects (Matryoshka Representation Learning) on ANN recall curves",
            "Graph pruning heuristics for high-degree hub nodes in high-dimensional embedding spaces",
            "Vector drift detection and automated re-indexing triggers for non-stationary corpora",
            "Zero-downtime hot-swapping of vector index partitions during full-corpus re-embedding",
            "Comparative latency of Cosine Similarity versus Dot Product on AVX-512 register sets",
            "Multi-vector representations (ColBERT Late Interaction) indexing challenges in HNSW",
        ],
    },
    {
        "domain": "Sparse & Lexical Retrieval (BM25Okapi)",
        "tenant_id": "tenant_search_foundations",
        "doc_prefix": "doc_bm25_",
        "topics": [
            "BM25Okapi term frequency saturation parameter k1 and document length normalization b tuning",
            "Inverted index compression techniques: PForDelta versus Elias-Fano bit-packing efficiency",
            "Stop-word filtering trade-offs in code search and technical API documentation retrieval",
            "Handling rare alphanumeric tokens, UUIDs, and exception stack traces in BM25 tokenizers",
            "Term proximity scoring extensions to BM25 for enterprise legal contract queries",
            "Dynamic pruning algorithms: WAND (Weak AND) and Block-Max WAND latency characteristics",
            "Multilingual tokenization and subword segmentations (Jieba, Kuromoji, Byte-Pair)",
            "Sparse vector representations (SPLADE v2) comparison against classic BM25 scoring",
            "Index sharding strategies for high-concurrency lexical search query clusters",
            "Handling query term negation and boolean operators in hybrid lexical-dense engines",
            "Cache eviction policies for posting lists under heavy Zipfian term distribution workloads",
            "Incremental inverted index commits without read lock contention in write-heavy tenants",
        ],
    },
    {
        "domain": "Reciprocal Rank Fusion (RRF) Hybrid Search",
        "tenant_id": "tenant_hybrid_retrieval_ai",
        "doc_prefix": "doc_rrf_",
        "topics": [
            "Reciprocal Rank Fusion smoothing constant k=60 sensitivity analysis across skewed rank distributions",
            "Convex combination vs RRF: Linear score normalization pitfalls when score distributions diverge",
            "Hybrid search fusion: Merging dense vector top-K with sparse BM25 top-K for cold-start queries",
            "Ordinal ranking invariance of RRF when integrating disparate scoring algorithms",
            "Weighted RRF: Introducing alpha coefficients to prioritize dense semantics over exact lexical matches",
            "RRF rank tie-breaking strategies when multiple candidate documents share identical reciprocal sums",
            "Multi-modal rank fusion: Unifying image embedding ranks, text embeddings, and metadata filters",
            "Impact of candidate pool size (depth K_pool) on reciprocal rank convergence and NDCG@10",
            "Latency budget allocation between parallel dense/sparse workers before RRF aggregation",
            "Zero-result fallback behavior when dense search returns high confidence but sparse returns zero hits",
            "Dynamic tuning of RRF k-constant based on input query semantic entropy and token length",
            "Cross-tenant isolation during hybrid RRF merges in multi-tenant shared-worker architectures",
        ],
    },
    {
        "domain": "Enterprise Multi-Tenant Isolation & RLS",
        "tenant_id": "tenant_enterprise_security",
        "doc_prefix": "doc_security_",
        "topics": [
            "Row-Level Security (RLS) enforcement at vector database ingestion and query projection gates",
            "Cross-tenant data leakage prevention in shared HNSW graph index collections",
            "Zero-trust credential delegation and RBAC claim propagation across microservice calls",
            "Encrypted vector search: Evaluating Homomorphic Encryption overhead on similarity dot products",
            "Hardware-isolated tenant partitions vs metadata-filtered multi-tenancy cost-benefit audit",
            "Audit logging specifications for compliance-mandated PII access patterns in RAG pipelines",
            "Tenant-level quota exhaustion and rate limiting under sudden burst query concurrency",
            "Automated cryptographic shredding of deleted tenant embeddings in compliance with GDPR",
            "Token-level access control: Filtering retrieved chunk spans based on user group memberships",
            "Data residency and sovereign cloud isolation boundaries for distributed inference nodes",
            "Side-channel timing attack mitigation during filtered ANN vector graph traversals",
            "Federated search across geographically segregated tenant vector stores",
        ],
    },
    {
        "domain": "Clinical Trials & Biomedical Evidence Extraction",
        "tenant_id": "tenant_apex_biotech_research",
        "doc_prefix": "doc_biomed_",
        "topics": [
            "Biomedical entity normalization: Mapping clinical trial inclusion criteria to MeSH and UMLS ontologies",
            "Adverse event extraction from FDA MedWatch safety notices using hybrid dense-lexical retrieval",
            "Phase III oncology trial patient matching algorithms using structured eligibility criteria",
            "Disambiguating pharmacogenomic drug-gene interaction mentions in unstructured trial notes",
            "Cross-lingual clinical trial document retrieval across PubMed and international registries",
            "Extracting dosage schedules and pharmacokinetic parameters from FDA package inserts",
            "Evaluating PubMedBERT embeddings against general-purpose BGE models for medical query recall",
            "Hierarchical retrieval of clinical trial protocols: Linking endpoints, interventions, and cohorts",
            "Automated meta-analysis synthesis: Aggregating odds ratios across randomized controlled trials",
            "Biomedical abbreviation expansion heuristics during clinical trial query preprocessing",
            "Safety-critical citation fidelity verification in clinical decision support RAG systems",
            "Temporal filtering in biomedical literature: Prioritizing recent clinical guidelines over legacy studies",
        ],
    },
    {
        "domain": "Zero-Trust Guardrails & PII Masking",
        "tenant_id": "tenant_cybersec_defense_grid",
        "doc_prefix": "doc_guardrail_",
        "topics": [
            "High-throughput PII and PHI redaction using Presidio and regex tokenizers prior to vector embedding",
            "Adversarial prompt injection detection using semantic vector guardrails and perplexity heuristics",
            "Jailbreak defense: Detecting indirect prompt injection within retrieved enterprise documents",
            "Homomorphic vector comparison: Computing similarity without decrypting document embeddings",
            "Data exfiltration guardrails: Verifying LLM synthesis does not echo raw confidential embeddings",
            "Automated redaction of Social Security Numbers, IBANs, and credit card patterns in real-time stream",
            "Context integrity attestation using cryptographic Merkle trees across retrieved chunks",
            "Differential privacy noise injection into dense embeddings for public search indexes",
            "Model inversion attack defenses: Preventing reconstruction of original document text from vectors",
            "Detecting hallucinated PII generation using cross-referenced enterprise entity directories",
            "Zero-trust authentication token verification on internal gRPC retrieval endpoints",
            "Fine-grained role-based masking of specific JSON metadata fields in search payloads",
        ],
    },
    {
        "domain": "Distributed Event Brokers & High-Throughput Ingestion",
        "tenant_id": "tenant_streaming_systems",
        "doc_prefix": "doc_stream_",
        "topics": [
            "Kafka partition key design for multi-tenant document ingestion and chunking pipelines",
            "Backpressure management in distributed consumers during high-volume document re-indexing",
            "Exactly-once processing semantics for vector database upsert pipelines using transactional outbox",
            "Optimizing embedding worker throughput with dynamic batching and Redis pub/sub queues",
            "Real-time index updates vs search read replicas: Replication lag mitigation strategies",
            "Dead-letter queue handling for malformed PDF and OCR corrupted documents in ingestion streams",
            "End-to-end telemetry and OpenTelemetry distributed tracing across ingestion microservices",
            "Schema evolution management in document ingestion pipelines using Avro and Schema Registry",
            "Stateful streaming aggregations in Flink for near-real-time retrieval analytics dashboards",
            "Managing vector database memory pressure during bulk historical data backfill jobs",
            "Multi-datacenter replication of Milvus and Qdrant clusters with low sync latency",
            "Chaos engineering: Simulating broker partition drops during live vector index updates",
        ],
    },
    {
        "domain": "Financial Compliance & Sarbanes-Oxley Audit",
        "tenant_id": "tenant_global_fintech_audit",
        "doc_prefix": "doc_fintech_",
        "topics": [
            "Retrieving 10-K and 10-Q SEC filing footnotes for Sarbanes-Oxley internal control auditing",
            "Algorithmic detection of material weakness disclosures in enterprise financial statements",
            "Reconciliation of unstructured invoice tables with structured ERP database ledgers",
            "Dense retrieval of anti-money laundering (AML) suspicious activity report (SAR) patterns",
            "Verifying source attribution citations in automated quarterly financial summaries",
            "Multi-currency exchange rate historical lookup and context-grounded conversion validation",
            "Auditing access logs for executive compensation and confidential merger documentation",
            "Extracting revenue recognition policy changes under ASC 606 from earnings call transcripts",
            "Compliance verification of ESG disclosures against European CSRD reporting standards",
            "Deterministic audit trail generation for automated AI-assisted financial statement review",
            "Temporal consistency checks: Detecting contradictory financial metrics across reporting periods",
            "Segregation of duties (SoD) violation detection using knowledge graph path traversal",
        ],
    },
    {
        "domain": "LLM Inference Optimization & Fast Serving",
        "tenant_id": "tenant_inference_infra",
        "doc_prefix": "doc_inference_",
        "topics": [
            "Groq LPU architecture and deterministic matrix multiplication latency advantages for RAG",
            "KV-cache memory management in vLLM: PagedAttention impact on concurrent retrieval generation",
            "Speculative decoding speedup ratios when pairing draft models with large generation models",
            "Tensor parallelism vs pipeline parallelism efficiency in 8x H100 GPU clusters for synthesis",
            "FP8 and INT4 quantization effects on reasoning accuracy in context-grounded QA tasks",
            "Prefix caching for shared system prompts and retrieved context chunks in high-QPS endpoints",
            "Dynamic batching optimization: Balancing time-to-first-token (TTFT) and throughput (tokens/sec)",
            "Continuous batching algorithms in TensorRT-LLM and Triton Inference Server",
            "SLO-aware scheduling for prioritized interactive user queries versus batch evaluation jobs",
            "Prompt compression methods: Selective context pruning to maximize effective context window",
            "End-to-end latency budget breakdown: Retrieval, reranking, TTFT, and generation streaming",
            "Cost-performance Pareto frontier analysis of open-weight models vs proprietary inference APIs",
        ],
    },
]

DENSE_MODELS = [
    ("BAAI/bge-large-en-v1.5", 1024),
    ("text-embedding-3-large", 1536),
    ("intfloat/e5-mistral-7b-instruct", 4096),
    ("mixedbread-ai/mxbai-embed-large", 1024),
    ("sentence-transformers/all-mpnet-base-v2", 768),
]

QUERY_TYPES = [
    "complex_semantic_synthesis",
    "exact_factual_lookup",
    "multi_hop_causal_reasoning",
    "algorithmic_derivation",
    "security_compliance_audit",
    "comparative_tradeoff_analysis",
]

HARDWARE_PLATFORMS = [
    "GroqCard LPU Node (v8 Tensor Units)",
    "NVIDIA A100-SXM4-80GB (PCIe Gen4)",
    "NVIDIA H100-NVL-94GB (TensorRT-LLM)",
    "Dual Intel Xeon Platinum 8480+ (AVX-512 VNNI)",
    "AMD Instinct MI300X (ROCm 6.1)",
]


def generate_benchmark_records(target_count: int = 150):
    records = []
    base_time = datetime.datetime(2026, 10, 19, 4, 0, 0, tzinfo=datetime.timezone.utc)
    
    total_domains = len(DOMAINS)
    
    for i in range(1, target_count + 1):
        domain_obj = DOMAINS[(i - 1) % total_domains]
        domain_name = domain_obj["domain"]
        tenant_id = domain_obj["tenant_id"]
        doc_prefix = domain_obj["doc_prefix"]
        topics = domain_obj["topics"]
        
        topic_idx = (i - 1) // total_domains
        topic = topics[topic_idx % len(topics)]
        
        # Varying run id groups (e.g. 10 batches of 15 queries)
        batch_id = ((i - 1) // 15) + 1
        run_id = f"BENCH-RUN-20261019-BATCH-{batch_id:02d}"
        log_id = f"log_telemetry_eval_{i:04d}"
        query_id = f"eval_query_{i:04d}"
        
        # Incremental realistic timestamps
        event_time = base_time + datetime.timedelta(seconds=(i * 18.5) + random.uniform(0.1, 4.2))
        timestamp_str = event_time.isoformat()
        
        # Retrieval parameters
        top_k = random.choice([5, 8, 10, 12, 15])
        dense_model_name, dense_dim = random.choice(DENSE_MODELS)
        dense_weight = round(random.uniform(0.50, 0.65), 2)
        sparse_weight = round(1.0 - dense_weight, 2)
        rrf_k = 60
        similarity_threshold = round(random.uniform(0.72, 0.85), 2)
        
        # Ground truth generation (3 to 6 expected docs)
        num_expected = random.randint(3, 5)
        expected_doc_ids = [
            f"{doc_prefix}{j:03d}_{topic.split()[-1].lower()}"
            for j in range(1, num_expected + 1)
        ]
        
        # Generate candidate pool retrieved
        # Determine how many expected docs actually get retrieved
        # Most of the time 60-100% recall
        recall_scenario = random.choices(["high", "medium", "edge_case"], weights=[0.65, 0.25, 0.10])[0]
        
        retrieved_docs_list = []
        retrieved_doc_ids = []
        
        if recall_scenario == "high":
            # 80-100% of expected docs retrieved, first one ranks 1 or 2
            included_expected = expected_doc_ids.copy()
            if random.random() < 0.25 and len(included_expected) > 3:
                included_expected.pop()
        elif recall_scenario == "medium":
            # 50-75% retrieved
            num_include = max(1, int(len(expected_doc_ids) * random.uniform(0.5, 0.75)))
            included_expected = random.sample(expected_doc_ids, num_include)
        else: # edge_case
            # Low recall or first relevant ranks lower
            num_include = max(1, int(len(expected_doc_ids) * random.uniform(0.25, 0.5)))
            included_expected = random.sample(expected_doc_ids, num_include)
            
        # Distractor document IDs
        distractors = [
            f"{doc_prefix}distractor_{d_idx:03d}"
            for d_idx in range(101, 101 + (top_k * 2))
        ]
        
        # Place relevant docs into top_k ranks
        if recall_scenario == "high":
            first_rank = random.choice([1, 1, 1, 2])
        elif recall_scenario == "medium":
            first_rank = random.choice([2, 3, 4])
        else:
            first_rank = random.choice([3, 4, 5, 6]) if top_k >= 6 else top_k
            
        first_rank = min(first_rank, top_k)
        
        # Build ranked retrieved docs
        relevant_pool = list(included_expected)
        distractor_pool = list(distractors)
        
        for rank in range(1, top_k + 1):
            if rank == first_rank and relevant_pool:
                doc_id = relevant_pool.pop(0)
                is_rel = True
            elif relevant_pool and random.random() < 0.45:
                doc_id = relevant_pool.pop(0)
                is_rel = True
            else:
                doc_id = distractor_pool.pop(0)
                is_rel = False
                
            # Simulate scores
            dense_score = round(max(0.55, 0.95 - (rank * 0.035) + random.uniform(-0.015, 0.015)), 4)
            sparse_score = round(max(3.0, 18.5 - (rank * 1.1) + random.uniform(-0.5, 0.5)), 3)
            # True RRF calculation
            dense_rank = rank + random.choice([0, 1, -1])
            dense_rank = max(1, dense_rank)
            sparse_rank = rank + random.choice([0, 1, 2, -1])
            sparse_rank = max(1, sparse_rank)
            
            rrf_score = round(
                (dense_weight / (rrf_k + dense_rank)) + (sparse_weight / (rrf_k + sparse_rank)),
                5
            )
            
            relevance_label = "exact_match" if is_rel and rank <= 2 else ("partial_context" if is_rel else "irrelevant")
            
            retrieved_docs_list.append({
                "document_id": doc_id,
                "rank": rank,
                "dense_score": dense_score,
                "sparse_score": sparse_score,
                "rrf_score": rrf_score,
                "is_relevant": is_rel,
                "relevance_label": relevance_label,
            })
            retrieved_doc_ids.append(doc_id)
            
        # Evaluation calculations
        intersect = set(retrieved_doc_ids) & set(expected_doc_ids)
        recall_at_k = round(len(intersect) / len(expected_doc_ids), 4)
        
        # Calculate reciprocal rank
        first_rel_rank = None
        for item in retrieved_docs_list:
            if item["is_relevant"]:
                first_rel_rank = item["rank"]
                break
                
        reciprocal_rank = round(1.0 / first_rel_rank, 4) if first_rel_rank else 0.0
        precision_at_k = round(len(intersect) / top_k, 4)
        
        # Approximate NDCG@K
        dcg = 0.0
        idcg = 0.0
        import math
        for idx, item in enumerate(retrieved_docs_list):
            rel_val = 1.0 if item["is_relevant"] else 0.0
            dcg += rel_val / math.log2(idx + 2)
        for idx in range(min(len(expected_doc_ids), top_k)):
            idcg += 1.0 / math.log2(idx + 2)
        ndcg_at_k = round(dcg / idcg, 4) if idcg > 0 else 0.0
        
        mrr_target = round(random.uniform(0.80, 0.95), 4)
        recall_target = round(random.uniform(0.70, 0.88), 4)
        sla_compliant = (recall_at_k >= (recall_target - 0.05)) and (reciprocal_rank >= (mrr_target - 0.15))
        evaluator_verdict = "PASS" if sla_compliant else "FLAGGED_FOR_REVIEW"
        
        # Telemetry
        dense_lat = round(random.uniform(7.8, 18.4), 2)
        sparse_lat = round(random.uniform(2.4, 8.9), 2)
        fusion_lat = round(random.uniform(0.6, 2.1), 2)
        total_lat = round(dense_lat + sparse_lat + fusion_lat, 2)
        peak_mb = round(random.uniform(128.0, 256.0), 1)
        cache_hit = random.random() < 0.18
        hw = random.choice(HARDWARE_PLATFORMS)
        
        record = {
            "benchmark_run_id": run_id,
            "log_id": log_id,
            "timestamp": timestamp_str,
            "tenant_id": tenant_id,
            "domain": domain_name,
            "query_id": query_id,
            "query_text": f"What are the best practices and architectural implications of: {topic}?",
            "query_type": random.choice(QUERY_TYPES),
            "query_token_length": len(topic.split()) + random.randint(6, 12),
            "retrieval_parameters": {
                "top_k": top_k,
                "dense_model": dense_model_name,
                "dense_embedding_dim": dense_dim,
                "dense_distance_metric": "cosine",
                "sparse_algorithm": "BM25Okapi",
                "bm25_k1": 1.5,
                "bm25_b": 0.75,
                "rrf_k": rrf_k,
                "dense_weight": dense_weight,
                "sparse_weight": sparse_weight,
                "similarity_threshold": similarity_threshold,
                "reranker_applied": False,
            },
            "expected_document_ids": expected_doc_ids,
            "retrieved_documents": retrieved_docs_list,
            "retrieved_document_ids": retrieved_doc_ids,
            "evaluation_metrics": {
                "recall_at_k": recall_at_k,
                "reciprocal_rank": reciprocal_rank,
                "precision_at_k": precision_at_k,
                "ndcg_at_k": ndcg_at_k,
                "mean_reciprocal_rank_target": mrr_target,
                "retrieval_recall_target": recall_target,
                "sla_compliant": sla_compliant,
                "evaluator_verdict": evaluator_verdict,
            },
            "telemetry": {
                "dense_search_latency_ms": dense_lat,
                "sparse_search_latency_ms": sparse_lat,
                "rrf_fusion_latency_ms": fusion_lat,
                "total_retrieval_latency_ms": total_lat,
                "memory_peak_mb": peak_mb,
                "cache_hit": cache_hit,
                "hardware_accelerator": hw,
                "status_code": 200,
            },
        }
        records.append(record)
        
    return records


if __name__ == "__main__":
    records = generate_benchmark_records(150)
    
    # Save to ai-service/retrieval_benchmark_dummy_datasets.json
    output_path_ai = "retrieval_benchmark_dummy_datasets.json"
    with open(output_path_ai, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    # Also save to root workspace retrieval_benchmark_dummy_datasets.json
    output_path_root = "../retrieval_benchmark_dummy_datasets.json"
    with open(output_path_root, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    print(f"Successfully generated {len(records)} benchmark queries.")
    print(f"Output files written to: {output_path_ai} and {output_path_root}")
