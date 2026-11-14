using System.Net;
using System.Text;
using System.Text.Json;
using EnterpriseApi.Application.Common.Models.AiService;

namespace EnterpriseApi.Infrastructure.Http.Mocks;

/// <summary>
/// Comprehensive mock fixtures, simulated JSON wire payloads, and resilient fallback models
/// utilized for unit testing, integration testing, and offline verification of the secure
/// .NET 8 to Python FastAPI inter-service bridge.
/// </summary>
public static class InterServiceMockFixtures
{
    // =========================================================================================
    // SECTION 1: ENTERPRISE TENANT IDENTIFIERS AND ROUTE CONSTANTS
    // =========================================================================================

    public const string TenantSkitAiLabs = "skit-ai-labs";
    public const string TenantAlphaEnterprise = "tenant_alpha_enterprise";
    public const string TenantBetaFinancial = "tenant_beta_financial";
    public const string TenantGovDefense = "tenant_gov_defense_secure";
    public const string TenantHealthCare = "tenant_healthcare_hipaa";

    public const string DefaultCorrelationId = "corr-mock-88192a-fa71-4820";
    public const string DefaultSharedApiKey = "EnterpriseAiServiceInternalSharedSecret2026!";

    public const string HealthEndpoint = "/health";
    public const string IngestEndpoint = "/api/v1/ingest";
    public const string SearchHybridEndpoint = "/api/v1/search/hybrid";
    public const string RagQueryEndpoint = "/api/v1/rag/query";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    // =========================================================================================
    // SECTION 2: HEALTH PROBE SIMULATED HTTP WIRE PAYLOADS AND DTOS
    // =========================================================================================

    /// <summary>
    /// Simulated HTTP 200 response wire payload when Python AI Microservice is fully operational.
    /// </summary>
    public const string HealthResponse_Healthy_Json = """
    {
      "status": "healthy",
      "service": "Enterprise AI Inference & Retrieval Engine",
      "timestamp": "2026-10-23T14:30:00Z",
      "groq_configured": true,
      "groq_model": "llama-3.3-70b-versatile",
      "vector_collection_count": 1420,
      "sparse_chunks_indexed": 1420
    }
    """;

    /// <summary>
    /// Simulated HTTP 200 response wire payload when upstream Groq API is degraded or missing.
    /// </summary>
    public const string HealthResponse_Degraded_Json = """
    {
      "status": "degraded",
      "service": "Enterprise AI Inference & Retrieval Engine",
      "timestamp": "2026-10-23T14:30:00Z",
      "groq_configured": false,
      "groq_model": "none",
      "vector_collection_count": 890,
      "sparse_chunks_indexed": 890
    }
    """;

    /// <summary>
    /// Simulated HTTP 503 response wire payload when ChromaDB vector service is unreachable.
    /// </summary>
    public const string HealthResponse_Unhealthy_Json = """
    {
      "status": "unhealthy",
      "service": "Enterprise AI Inference & Retrieval Engine",
      "timestamp": "2026-10-23T14:30:00Z",
      "groq_configured": true,
      "groq_model": "llama-3.3-70b-versatile",
      "vector_collection_count": 0,
      "sparse_chunks_indexed": 0,
      "error": "Connection to ChromaDB daemon refused at localhost:8000"
    }
    """;

    /// <summary>
    /// Strongly typed DTO representing the healthy microservice state.
    /// </summary>
    public static readonly AiServiceHealthDto HealthDto_Healthy = new()
    {
        Status = "healthy",
        Service = "Enterprise AI Inference & Retrieval Engine",
        Timestamp = "2026-10-23T14:30:00Z",
        GroqConfigured = true,
        GroqModel = "llama-3.3-70b-versatile",
        VectorCollectionCount = 1420,
        SparseChunksIndexed = 1420
    };

    /// <summary>
    /// Strongly typed DTO representing degraded microservice state.
    /// </summary>
    public static readonly AiServiceHealthDto HealthDto_Degraded = new()
    {
        Status = "degraded",
        Service = "Enterprise AI Inference & Retrieval Engine",
        Timestamp = "2026-10-23T14:30:00Z",
        GroqConfigured = false,
        GroqModel = "none",
        VectorCollectionCount = 890,
        SparseChunksIndexed = 890
    };

    // =========================================================================================
    // SECTION 3: DOCUMENT INGESTION REQUEST/RESPONSE FIXTURES
    // =========================================================================================

    #region Document Ingestion Fixture 01: CRAG Architecture Whitepaper
    public const string IngestRequest_Doc01_CragArchitecture_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "document_id": "doc-crag-arch-001",
      "content": "# Corrective Retrieval-Augmented Generation (CRAG) Architecture Specification 2026\n\nSection 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators.\nLarge language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions to prevent hallucinations.\n\nSection 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF).\nRetrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB (using normalized cosine distance) paired with exact lexical BM25Okapi keyword matching (k1=1.5, b=0.75). Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)). This normalizes disparate score distributions without unstable min-max calibration.\n\nSection 2.1: Multi-Tenant Logical Isolation & Row-Level Security.\nEvery persisted document and vector embedding is strictly partitioned by tenant GUID. The backend ASP.NET gateway validates cryptographically signed JWT claims on every HTTP request and attaches Entity Framework Core global query filters (WHERE TenantId = @CurrentTenantId), guaranteeing zero cross-tenant data leakage.",
      "metadata": {
        "title": "CRAG Architecture Specification 2026",
        "author": "Chief AI Architect",
        "classification": "Internal",
        "category": "Whitepaper",
        "page_count": 4,
        "format": "Markdown"
      }
    }
    """;

    public const string IngestResponse_Doc01_CragArchitecture_Json = """
    {
      "message": "Document ingestion processed successfully.",
      "document_id": "doc-crag-arch-001",
      "tenant_id": "skit-ai-labs",
      "chunks_indexed": 6,
      "total_tenant_vector_count": 1426
    }
    """;

    public static readonly DocumentIngestionRequestDto IngestDto_Doc01_CragArchitecture = new()
    {
        TenantId = TenantSkitAiLabs,
        DocumentId = "doc-crag-arch-001",
        Content = "# Corrective Retrieval-Augmented Generation (CRAG) Architecture Specification 2026\n\nSection 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators.\nLarge language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions to prevent hallucinations.\n\nSection 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF).\nRetrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB (using normalized cosine distance) paired with exact lexical BM25Okapi keyword matching (k1=1.5, b=0.75). Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)). This normalizes disparate score distributions without unstable min-max calibration.\n\nSection 2.1: Multi-Tenant Logical Isolation & Row-Level Security.\nEvery persisted document and vector embedding is strictly partitioned by tenant GUID. The backend ASP.NET gateway validates cryptographically signed JWT claims on every HTTP request and attaches Entity Framework Core global query filters (WHERE TenantId = @CurrentTenantId), guaranteeing zero cross-tenant data leakage.",
        Metadata = new Dictionary<string, object>
        {
            ["title"] = "CRAG Architecture Specification 2026",
            ["author"] = "Chief AI Architect",
            ["classification"] = "Internal",
            ["category"] = "Whitepaper",
            ["page_count"] = 4,
            ["format"] = "Markdown"
        }
    };

    public static readonly DocumentIngestionResponseDto IngestResponseDto_Doc01_CragArchitecture = new()
    {
        Message = "Document ingestion processed successfully.",
        DocumentId = "doc-crag-arch-001",
        TenantId = TenantSkitAiLabs,
        ChunksIndexed = 6,
        TotalTenantVectorCount = 1426
    };
    #endregion

    #region Document Ingestion Fixture 02: Multi-Tenancy & Cryptographic Security
    public const string IngestRequest_Doc02_MultiTenancySecurity_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "document_id": "doc-sec-multitenancy-002",
      "content": "# Enterprise Multi-Tenancy Security & Cryptographic Boundary Enforcement\n\n1. Isolation Primitives:\nMulti-tenant data isolation is guaranteed through a defense-in-depth model combining transport-layer security (mTLS), application-layer tenant resolution middleware, database-level EF Core Global Query Filters, and vector-level collection metadata filtering.\n\n2. Token Exchange Protocol:\nWhen the ASP.NET Core API Gateway dispatches inter-service calls to downstream microservices, the BearerTokenPropagationDelegatingHandler propagates caller JWT credentials or mints an ephemeral HMAC-SHA256 inter-service delegation token. Headers 'X-Tenant-ID' and 'X-Tenant-Identifier' are enforced on every HTTP frame.\n\n3. Storage Layer Partitioning:\nRelational SQL storage tags every entity row with a non-nullable TenantId GUID foreign key. Dense vector chunks stored in ChromaDB feature metadata key 'tenant_id'. Queries without exact tenant match are pruned before similarity scoring.",
      "metadata": {
        "title": "Enterprise Multi-Tenancy Security Specification",
        "author": "Security Engineering Staff",
        "classification": "Confidential",
        "category": "SecurityPolicy",
        "version": "2.4.0"
      }
    }
    """;

    public const string IngestResponse_Doc02_MultiTenancySecurity_Json = """
    {
      "message": "Document ingestion processed successfully.",
      "document_id": "doc-sec-multitenancy-002",
      "tenant_id": "skit-ai-labs",
      "chunks_indexed": 4,
      "total_tenant_vector_count": 1430
    }
    """;

    public static readonly DocumentIngestionRequestDto IngestDto_Doc02_MultiTenancySecurity = new()
    {
        TenantId = TenantSkitAiLabs,
        DocumentId = "doc-sec-multitenancy-002",
        Content = "# Enterprise Multi-Tenancy Security & Cryptographic Boundary Enforcement\n\n1. Isolation Primitives:\nMulti-tenant data isolation is guaranteed through a defense-in-depth model combining transport-layer security (mTLS), application-layer tenant resolution middleware, database-level EF Core Global Query Filters, and vector-level collection metadata filtering.\n\n2. Token Exchange Protocol:\nWhen the ASP.NET Core API Gateway dispatches inter-service calls to downstream microservices, the BearerTokenPropagationDelegatingHandler propagates caller JWT credentials or mints an ephemeral HMAC-SHA256 inter-service delegation token. Headers 'X-Tenant-ID' and 'X-Tenant-Identifier' are enforced on every HTTP frame.\n\n3. Storage Layer Partitioning:\nRelational SQL storage tags every entity row with a non-nullable TenantId GUID foreign key. Dense vector chunks stored in ChromaDB feature metadata key 'tenant_id'. Queries without exact tenant match are pruned before similarity scoring.",
        Metadata = new Dictionary<string, object>
        {
            ["title"] = "Enterprise Multi-Tenancy Security Specification",
            ["author"] = "Security Engineering Staff",
            ["classification"] = "Confidential",
            ["category"] = "SecurityPolicy",
            ["version"] = "2.4.0"
        }
    };
    #endregion

    #region Document Ingestion Fixture 03: SOC2 Type II Audit Compliance
    public const string IngestRequest_Doc03_Soc2Compliance_Json = """
    {
      "tenant_id": "tenant_alpha_enterprise",
      "document_id": "doc-compliance-soc2-003",
      "content": "# SOC2 Type II Compliance & Continuous Control Monitoring\n\nSection CC6.1 - Logical Access Controls:\nAccess to production infrastructure and microservices requires cryptographic authentication. Password policies mandate at least 8 characters, non-alphanumeric characters, and maximum 5 failed attempts before a 15-minute account lockout.\n\nSection CC6.6 - Boundary Protection & Encryption in Transit:\nAll network ingress endpoints enforce TLS 1.3 with HSTS enabled (max-age: 31536000 seconds). Inter-service traffic traversing Kubernetes pods is encrypted via Mutual TLS with automated 90-day certificate rotations.\n\nSection CC7.2 - System Monitoring & Incident Response:\nCentralized correlation identifiers (X-Correlation-ID) track every request across API Gateway, Message Bus, and AI Inference workers. Any unauthorized cross-tenant attempt triggers real-time security alerts.",
      "metadata": {
        "title": "SOC2 Type II Audit Compliance Guide",
        "author": "Compliance Officer",
        "classification": "Restricted",
        "regulatory_framework": "SOC2-2026"
      }
    }
    """;

    public const string IngestResponse_Doc03_Soc2Compliance_Json = """
    {
      "message": "Document ingestion processed successfully.",
      "document_id": "doc-compliance-soc2-003",
      "tenant_id": "tenant_alpha_enterprise",
      "chunks_indexed": 5,
      "total_tenant_vector_count": 912
    }
    """;
    #endregion

    #region Document Ingestion Fixture 04: Groq LPU Inference Performance
    public const string IngestRequest_Doc04_GroqInference_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "document_id": "doc-groq-perf-004",
      "content": "# High-Speed Inference Architecture via Groq Language Processing Units (LPUs)\n\nOverview:\nTraditional GPU clusters suffer from memory bandwidth bottlenecks during auto-regressive token generation. Groq LPU hardware utilizes deterministic tensor execution without dynamic caching delays, achieving over 450 tokens per second on Llama-3.3-70b-versatile.\n\nGrounding & Verification Pipeline:\nRetrieved candidates from Reciprocal Rank Fusion are formatted into an immutable system prompt. The model is constrained to cite source chunk identifiers and page numbers. When context relevance falls below 0.82, the model emits an explicit lack-of-knowledge token rather than hallucinatory assertions.",
      "metadata": {
        "title": "Groq LPU Hardware Acceleration Whitepaper",
        "author": "Inference Engineering Team",
        "classification": "Internal",
        "model": "llama-3.3-70b-versatile"
      }
    }
    """;

    public const string IngestResponse_Doc04_GroqInference_Json = """
    {
      "message": "Document ingestion processed successfully.",
      "document_id": "doc-groq-perf-004",
      "tenant_id": "skit-ai-labs",
      "chunks_indexed": 3,
      "total_tenant_vector_count": 1433
    }
    """;
    #endregion

    #region Document Ingestion Fixture 05: Mathematical Python Sandbox Execution
    public const string IngestRequest_Doc05_MathSandbox_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "document_id": "doc-math-sandbox-005",
      "content": "# Sandboxed Python Computational Environment Security Specification\n\nExecution Sandbox:\nTo prevent arbitrary code execution on host worker nodes, mathematical formula evaluation and statistical calculations are routed to a containerized Python sandbox with read-only root filesystems, seccomp filters, and zero egress networking.\n\nExecution Constraints:\n- CPU quota: 0.5 cores max\n- Memory limit: 256MB hard ceiling\n- Wall-clock timeout: 1500 milliseconds\n- Blacklisted modules: os, sys, subprocess, socket, urllib, pathlib, pty, shlex\n- Whitelisted modules: math, numpy, scipy.stats, sympy, statistics, decimal",
      "metadata": {
        "title": "Sandboxed Python Sandbox Architecture",
        "author": "Infra Security Lead",
        "classification": "Confidential"
      }
    }
    """;

    public const string IngestResponse_Doc05_MathSandbox_Json = """
    {
      "message": "Document ingestion processed successfully.",
      "document_id": "doc-math-sandbox-005",
      "tenant_id": "skit-ai-labs",
      "chunks_indexed": 3,
      "total_tenant_vector_count": 1436
    }
    """;
    #endregion

    // =========================================================================================
    // SECTION 4: HYBRID SEARCH (DENSE + BM25 + RRF) REQUEST/RESPONSE FIXTURES
    // =========================================================================================

    #region Hybrid Search Fixture 01: CRAG Architecture Inquiry
    public const string SearchRequest_Query01_Crag_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "How does Corrective RAG prevent hallucinations in enterprise documents?",
      "top_k": 3
    }
    """;

    public const string SearchResponse_Query01_Crag_Json = """
    {
      "query": "How does Corrective RAG prevent hallucinations in enterprise documents?",
      "tenant_id": "skit-ai-labs",
      "results": [
        {
          "chunk_id": "doc-crag-arch-001_chk_001",
          "document_id": "doc-crag-arch-001",
          "content": "Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators. Large language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions.",
          "page": 1,
          "rrf_score": 0.03278688524590164,
          "dense_rank": 1,
          "sparse_rank": 1,
          "metadata": {
            "title": "CRAG Architecture Specification 2026",
            "section": "1.1",
            "author": "Chief AI Architect"
          }
        },
        {
          "chunk_id": "doc-crag-arch-001_chk_002",
          "document_id": "doc-crag-arch-001",
          "content": "Section 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF). Retrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB paired with exact lexical BM25Okapi keyword matching. Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)).",
          "page": 1,
          "rrf_score": 0.03175403225806452,
          "dense_rank": 2,
          "sparse_rank": 3,
          "metadata": {
            "title": "CRAG Architecture Specification 2026",
            "section": "1.2"
          }
        },
        {
          "chunk_id": "doc-groq-perf-004_chk_002",
          "document_id": "doc-groq-perf-004",
          "content": "Grounding & Verification Pipeline: Retrieved candidates from Reciprocal Rank Fusion are formatted into an immutable system prompt. The model is constrained to cite source chunk identifiers and page numbers. When context relevance falls below 0.82, the model emits an explicit lack-of-knowledge token rather than hallucinatory assertions.",
          "page": 2,
          "rrf_score": 0.030806451612903224,
          "dense_rank": 3,
          "sparse_rank": 4,
          "metadata": {
            "title": "Groq LPU Hardware Acceleration Whitepaper"
          }
        }
      ]
    }
    """;

    public static readonly HybridSearchRequestDto SearchDto_Query01_Crag = new()
    {
        TenantId = TenantSkitAiLabs,
        Query = "How does Corrective RAG prevent hallucinations in enterprise documents?",
        TopK = 3
    };

    public static readonly HybridSearchResponseDto SearchResponseDto_Query01_Crag = new()
    {
        Query = "How does Corrective RAG prevent hallucinations in enterprise documents?",
        TenantId = TenantSkitAiLabs,
        Results = new List<FusedDocumentDto>
        {
            new()
            {
                ChunkId = "doc-crag-arch-001_chk_001",
                DocumentId = "doc-crag-arch-001",
                Content = "Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators. Large language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions.",
                Page = 1,
                RrfScore = 0.03278688524590164,
                DenseRank = 1,
                SparseRank = 1,
                Metadata = new Dictionary<string, object>
                {
                    ["title"] = "CRAG Architecture Specification 2026",
                    ["section"] = "1.1",
                    ["author"] = "Chief AI Architect"
                }
            },
            new()
            {
                ChunkId = "doc-crag-arch-001_chk_002",
                DocumentId = "doc-crag-arch-001",
                Content = "Section 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF). Retrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB paired with exact lexical BM25Okapi keyword matching. Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)).",
                Page = 1,
                RrfScore = 0.03175403225806452,
                DenseRank = 2,
                SparseRank = 3,
                Metadata = new Dictionary<string, object>
                {
                    ["title"] = "CRAG Architecture Specification 2026",
                    ["section"] = "1.2"
                }
            },
            new()
            {
                ChunkId = "doc-groq-perf-004_chk_002",
                DocumentId = "doc-groq-perf-004",
                Content = "Grounding & Verification Pipeline: Retrieved candidates from Reciprocal Rank Fusion are formatted into an immutable system prompt. The model is constrained to cite source chunk identifiers and page numbers. When context relevance falls below 0.82, the model emits an explicit lack-of-knowledge token rather than hallucinatory assertions.",
                Page = 2,
                RrfScore = 0.030806451612903224,
                DenseRank = 3,
                SparseRank = 4,
                Metadata = new Dictionary<string, object>
                {
                    ["title"] = "Groq LPU Hardware Acceleration Whitepaper"
                }
            }
        }
    };
    #endregion

    #region Hybrid Search Fixture 02: Multi-Tenant Database Isolation
    public const string SearchRequest_Query02_MultiTenancy_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "How is multi-tenant isolation enforced at database and vector levels?",
      "top_k": 2
    }
    """;

    public const string SearchResponse_Query02_MultiTenancy_Json = """
    {
      "query": "How is multi-tenant isolation enforced at database and vector levels?",
      "tenant_id": "skit-ai-labs",
      "results": [
        {
          "chunk_id": "doc-sec-multitenancy-002_chk_001",
          "document_id": "doc-sec-multitenancy-002",
          "content": "1. Isolation Primitives: Multi-tenant data isolation is guaranteed through a defense-in-depth model combining transport-layer security (mTLS), application-layer tenant resolution middleware, database-level EF Core Global Query Filters, and vector-level collection metadata filtering.",
          "page": 1,
          "rrf_score": 0.03225806451612903,
          "dense_rank": 1,
          "sparse_rank": 2,
          "metadata": {
            "title": "Enterprise Multi-Tenancy Security Specification",
            "classification": "Confidential"
          }
        },
        {
          "chunk_id": "doc-crag-arch-001_chk_003",
          "document_id": "doc-crag-arch-001",
          "content": "Section 2.1: Multi-Tenant Logical Isolation & Row-Level Security. Every persisted document and vector embedding is strictly partitioned by tenant GUID. The backend ASP.NET gateway validates cryptographically signed JWT claims on every HTTP request and attaches Entity Framework Core global query filters (WHERE TenantId = @CurrentTenantId), guaranteeing zero cross-tenant data leakage.",
          "page": 2,
          "rrf_score": 0.03125,
          "dense_rank": 2,
          "sparse_rank": 4,
          "metadata": {
            "title": "CRAG Architecture Specification 2026",
            "section": "2.1"
          }
        }
      ]
    }
    """;
    #endregion

    #region Hybrid Search Fixture 03: Reciprocal Rank Fusion Formula
    public const string SearchRequest_Query03_RrfFormula_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "What is the formula and smoothing constant for Reciprocal Rank Fusion RRF?",
      "top_k": 2
    }
    """;

    public const string SearchResponse_Query03_RrfFormula_Json = """
    {
      "query": "What is the formula and smoothing constant for Reciprocal Rank Fusion RRF?",
      "tenant_id": "skit-ai-labs",
      "results": [
        {
          "chunk_id": "doc-crag-arch-001_chk_002",
          "document_id": "doc-crag-arch-001",
          "content": "Section 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF). Retrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB (using normalized cosine distance) paired with exact lexical BM25Okapi keyword matching (k1=1.5, b=0.75). Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)). This normalizes disparate score distributions without unstable min-max calibration.",
          "page": 1,
          "rrf_score": 0.03278688524590164,
          "dense_rank": 1,
          "sparse_rank": 1,
          "metadata": {
            "title": "CRAG Architecture Specification 2026",
            "section": "1.2"
          }
        }
      ]
    }
    """;
    #endregion

    #region Hybrid Search Fixture 04: Zero Candidate / Unindexed Tenant Query
    public const string SearchRequest_Query04_EmptyResults_Json = """
    {
      "tenant_id": "tenant_gov_defense_secure",
      "query": "Explain unindexed proprietary quantum hardware blueprints",
      "top_k": 5
    }
    """;

    public const string SearchResponse_Query04_EmptyResults_Json = """
    {
      "query": "Explain unindexed proprietary quantum hardware blueprints",
      "tenant_id": "tenant_gov_defense_secure",
      "results": []
    }
    """;
    #endregion

    // =========================================================================================
    // SECTION 5: END-TO-END RAG QUERY AND SYNTHESIS REQUEST/RESPONSE FIXTURES
    // =========================================================================================

    #region RAG Fixture 01: Complete Corrective RAG Inquiry with Grounded Citations
    public const string RagRequest_Query01_Crag_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "How does Corrective RAG mitigate hallucinations and what confidence threshold triggers fallback?",
      "top_k": 3,
      "temperature": 0.1,
      "max_tokens": 1024
    }
    """;

    public const string RagResponse_Query01_Crag_Json = """
    {
      "query": "How does Corrective RAG mitigate hallucinations and what confidence threshold triggers fallback?",
      "tenant_id": "skit-ai-labs",
      "synthesized_response": "The Corrective Retrieval-Augmented Generation (CRAG) architecture mitigates hallucinations through a deterministic state machine evaluator implemented via LangGraph. Instead of naively feeding retrieved chunks to the LLM, the system dynamically scores retrieved context confidence against a calibrated threshold of 0.82.\n\nWhen retrieval confidence meets or exceeds 0.82, candidate documents are unified via Reciprocal Rank Fusion (k=60) combining ChromaDB normalized cosine dense vectors and BM25Okapi lexical matching, and then synthesized by the Groq LPU inference engine with explicit chunk citations. If retrieval confidence falls below the 0.82 threshold, the state machine triggers fallback paths such as query rewriting, secondary search, or explicitly stating that the private corpus lacks sufficient evidence, thereby eliminating synthetic hallucinations.",
      "citations": [
        {
          "document_id": "doc-crag-arch-001",
          "page": 1,
          "snippet": "The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions.",
          "score": 0.96
        },
        {
          "document_id": "doc-crag-arch-001",
          "page": 1,
          "snippet": "Section 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF). Retrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB paired with exact lexical BM25Okapi keyword matching. Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)).",
          "score": 0.91
        },
        {
          "document_id": "doc-groq-perf-004",
          "page": 2,
          "snippet": "When context relevance falls below 0.82, the model emits an explicit lack-of-knowledge token rather than hallucinatory assertions.",
          "score": 0.89
        }
      ],
      "retrieved_documents": [
        {
          "chunk_id": "doc-crag-arch-001_chk_001",
          "document_id": "doc-crag-arch-001",
          "content": "Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators. Large language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82).",
          "page": 1,
          "rrf_score": 0.03278688524590164,
          "dense_rank": 1,
          "sparse_rank": 1,
          "metadata": {
            "title": "CRAG Architecture Specification 2026"
          }
        }
      ],
      "model_used": "llama-3.3-70b-versatile",
      "latency_ms": 348.6,
      "provider": "Groq LPU Hardware Acceleration Engine"
    }
    """;

    public static readonly RagQueryRequestDto RagDto_Query01_Crag = new()
    {
        TenantId = TenantSkitAiLabs,
        Query = "How does Corrective RAG mitigate hallucinations and what confidence threshold triggers fallback?",
        TopK = 3,
        Temperature = 0.1,
        MaxTokens = 1024
    };

    public static readonly RagQueryResponseDto RagResponseDto_Query01_Crag = new()
    {
        Query = "How does Corrective RAG mitigate hallucinations and what confidence threshold triggers fallback?",
        TenantId = TenantSkitAiLabs,
        SynthesizedResponse = "The Corrective Retrieval-Augmented Generation (CRAG) architecture mitigates hallucinations through a deterministic state machine evaluator implemented via LangGraph. Instead of naively feeding retrieved chunks to the LLM, the system dynamically scores retrieved context confidence against a calibrated threshold of 0.82.\n\nWhen retrieval confidence meets or exceeds 0.82, candidate documents are unified via Reciprocal Rank Fusion (k=60) combining ChromaDB normalized cosine dense vectors and BM25Okapi lexical matching, and then synthesized by the Groq LPU inference engine with explicit chunk citations. If retrieval confidence falls below the 0.82 threshold, the state machine triggers fallback paths such as query rewriting, secondary search, or explicitly stating that the private corpus lacks sufficient evidence, thereby eliminating synthetic hallucinations.",
        Citations = new List<CitationMetadataDto>
        {
            new()
            {
                DocumentId = "doc-crag-arch-001",
                Page = 1,
                Snippet = "The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82). If retrieval confidence falls below 0.82, the evaluator triggers iterative query rewriting, web search fallback, or refuses unsupported assertions.",
                Score = 0.96
            },
            new()
            {
                DocumentId = "doc-crag-arch-001",
                Page = 1,
                Snippet = "Section 1.2: Hybrid Retrieval & Reciprocal Rank Fusion (RRF). Retrieval executes a two-tier candidate search: dense semantic embeddings in ChromaDB paired with exact lexical BM25Okapi keyword matching. Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)).",
                Score = 0.91
            },
            new()
            {
                DocumentId = "doc-groq-perf-004",
                Page = 2,
                Snippet = "When context relevance falls below 0.82, the model emits an explicit lack-of-knowledge token rather than hallucinatory assertions.",
                Score = 0.89
            }
        },
        RetrievedDocuments = new List<FusedDocumentDto>
        {
            new()
            {
                ChunkId = "doc-crag-arch-001_chk_001",
                DocumentId = "doc-crag-arch-001",
                Content = "Section 1.1: Asynchronous Knowledge Ingestion & LangGraph Evaluators. Large language models frequently encounter hallucinations when queried on private enterprise corpora. The CRAG framework introduces a deterministic state machine evaluator that dynamically evaluates retrieved context confidence (default threshold: 0.82).",
                Page = 1,
                RrfScore = 0.03278688524590164,
                DenseRank = 1,
                SparseRank = 1,
                Metadata = new Dictionary<string, object>
                {
                    ["title"] = "CRAG Architecture Specification 2026"
                }
            }
        },
        ModelUsed = "llama-3.3-70b-versatile",
        LatencyMs = 348.6,
        Provider = "Groq LPU Hardware Acceleration Engine"
    };
    #endregion

    #region RAG Fixture 02: Multi-Tenant JWT Claim and EF Core Boundary Inquiry
    public const string RagRequest_Query02_Security_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "Describe how JWT claims and EF Core global filters guarantee tenant segregation.",
      "top_k": 2
    }
    """;

    public const string RagResponse_Query02_Security_Json = """
    {
      "query": "Describe how JWT claims and EF Core global filters guarantee tenant segregation.",
      "tenant_id": "skit-ai-labs",
      "synthesized_response": "Tenant segregation is guaranteed by synchronizing identity claims from the caller's JWT with the database query pipeline. On incoming HTTP requests, the TenantResolutionMiddleware extracts the 'tenant_id' claim from the cryptographically verified JWT token and populates the ICurrentTenantService scoped container.\n\nEntity Framework Core automatically applies global query filters (WHERE TenantId = @CurrentTenantId) across all database operations. When communicating with the Python AI microservice, the TenantHeaderPropagationDelegatingHandler injects 'X-Tenant-ID' headers, ensuring that both ChromaDB dense vector lookups and BM25 lexical searches partition queries strictly by tenant GUID, preventing cross-tenant information disclosure.",
      "citations": [
        {
          "document_id": "doc-sec-multitenancy-002",
          "page": 1,
          "snippet": "Multi-tenant data isolation is guaranteed through a defense-in-depth model combining transport-layer security (mTLS), application-layer tenant resolution middleware, database-level EF Core Global Query Filters, and vector-level collection metadata filtering.",
          "score": 0.95
        },
        {
          "document_id": "doc-crag-arch-001",
          "page": 2,
          "snippet": "The backend ASP.NET gateway validates cryptographically signed JWT claims on every HTTP request and attaches Entity Framework Core global query filters (WHERE TenantId = @CurrentTenantId), guaranteeing zero cross-tenant data leakage.",
          "score": 0.94
        }
      ],
      "retrieved_documents": [],
      "model_used": "llama-3.3-70b-versatile",
      "latency_ms": 289.4,
      "provider": "Groq LPU Hardware Acceleration Engine"
    }
    """;
    #endregion

    #region RAG Fixture 03: Hallucination Rejection / Low Confidence Fallback
    public const string RagRequest_Query03_UnknownTopic_Json = """
    {
      "tenant_id": "skit-ai-labs",
      "query": "What are the exact nuclear submarine reactor coolant temperatures recorded in 1984?",
      "top_k": 3
    }
    """;

    public const string RagResponse_Query03_UnknownTopic_Json = """
    {
      "query": "What are the exact nuclear submarine reactor coolant temperatures recorded in 1984?",
      "tenant_id": "skit-ai-labs",
      "synthesized_response": "I cannot answer this question because the private enterprise knowledge corpus contains no verified documentation or context regarding submarine reactor coolant temperatures. Under the Corrective RAG (CRAG) protocol, unsupported assertions are strictly refused to prevent hallucinations.",
      "citations": [],
      "retrieved_documents": [],
      "model_used": "llama-3.3-70b-versatile",
      "latency_ms": 112.5,
      "provider": "Groq LPU Hardware Acceleration Engine (CRAG Rejection Fallback)"
    }
    """;
    #endregion

    // =========================================================================================
    // SECTION 6: RESILIENCE, CIRCUIT BREAKER, AND RFC 7807 ERROR WIRE PAYLOADS
    // =========================================================================================

    #region Error Payload 01: FastAPI Pydantic HTTP 422 Unprocessable Entity
    public const string Error_FastApi_422_UnprocessableEntity_Json = """
    {
      "detail": [
        {
          "loc": [
            "body",
            "content"
          ],
          "msg": "field required",
          "type": "value_error.missing"
        },
        {
          "loc": [
            "body",
            "tenant_id"
          ],
          "msg": "string does not match regex pattern '^[a-zA-Z0-9_-]+$'",
          "type": "value_error.regex"
        }
      ]
    }
    """;
    #endregion

    #region Error Payload 02: HTTP 400 Bad Request
    public const string Error_FastApi_400_BadRequest_Json = """
    {
      "detail": "Document content cannot be empty or solely whitespace."
    }
    """;
    #endregion

    #region Error Payload 03: HTTP 401 Unauthorized (Missing/Bad API Key)
    public const string Error_FastApi_401_Unauthorized_Json = """
    {
      "detail": "Invalid or missing inter-service API key in 'X-API-Key' or 'Authorization' header."
    }
    """;
    #endregion

    #region Error Payload 04: HTTP 403 Forbidden (Cross-Tenant Boundary Violation)
    public const string Error_FastApi_403_Forbidden_Json = """
    {
      "detail": "Cross-tenant access violation: Caller tenant 'tenant_alpha_enterprise' is not authorized to query or mutate target scope 'skit-ai-labs'."
    }
    """;
    #endregion

    #region Error Payload 05: HTTP 429 Too Many Requests (Rate Limit / Quota Exceeded)
    public const string Error_FastApi_429_RateLimitExceeded_Json = """
    {
      "detail": "Groq LPU token quota per minute exceeded for tenant 'skit-ai-labs'. Please retry after 15 seconds."
    }
    """;
    #endregion

    #region Error Payload 06: HTTP 500 Internal Server Error (ChromaDB Connection Failure)
    public const string Error_FastApi_500_ChromaDbDown_Json = """
    {
      "detail": "ChromaDB vector embedding daemon connection timeout after 5000ms."
    }
    """;
    #endregion

    #region Error Payload 07: HTTP 502 Bad Gateway / Upstream Proxy Crash
    public const string Error_Http_502_BadGateway_Json = """
    {
      "detail": "Bad Gateway: Upstream inference worker process terminated unexpectedly."
    }
    """;
    #endregion

    #region Error Payload 08: HTTP 503 Service Unavailable (Circuit Breaker Tripped)
    public const string Error_Http_503_CircuitBreakerOpen_Json = """
    {
      "type": "https://tools.ietf.org/html/rfc7231#section-6.6.4",
      "title": "Service Unavailable: Circuit Breaker Open",
      "status": 503,
      "detail": "The downstream 'ai-service' is experiencing transient failure; circuit is currently Open. Fail-fast active for 14.8s.",
      "instance": "/api/v1/rag/query",
      "circuit": "ai-service-breaker"
    }
    """;
    #endregion

    #region Error Payload 09: HTTP 504 Gateway Timeout
    public const string Error_Http_504_GatewayTimeout_Json = """
    {
      "detail": "Gateway Timeout: The AI microservice did not respond within the 30.0s deadline."
    }
    """;
    #endregion

    // =========================================================================================
    // SECTION 7: CIRCUIT BREAKER TELEMETRY STATUS FIXTURES
    // =========================================================================================

    public static readonly AiServiceCircuitBreakerStatusDto CircuitStatus_Closed = new()
    {
        Circuit = "ai-service-breaker",
        State = "Closed",
        ConsecutiveFailures = 0,
        FailureThreshold = 5,
        LastFailureTimeUtc = null,
        LastStateTransitionUtc = DateTime.UtcNow.AddHours(-2),
        BreakDurationRemainingSeconds = 0
    };

    public static readonly AiServiceCircuitBreakerStatusDto CircuitStatus_Open = new()
    {
        Circuit = "ai-service-breaker",
        State = "Open",
        ConsecutiveFailures = 5,
        FailureThreshold = 5,
        LastFailureTimeUtc = DateTime.UtcNow.AddSeconds(-3),
        LastStateTransitionUtc = DateTime.UtcNow.AddSeconds(-3),
        BreakDurationRemainingSeconds = 12.0
    };

    public static readonly AiServiceCircuitBreakerStatusDto CircuitStatus_HalfOpen = new()
    {
        Circuit = "ai-service-breaker",
        State = "HalfOpen",
        ConsecutiveFailures = 5,
        FailureThreshold = 5,
        LastFailureTimeUtc = DateTime.UtcNow.AddSeconds(-16),
        LastStateTransitionUtc = DateTime.UtcNow,
        BreakDurationRemainingSeconds = 0
    };

    // =========================================================================================
    // SECTION 8: FALLBACK DATA GENERATORS FOR DEGRADED OFFLINE RESILIENCE
    // =========================================================================================

    /// <summary>
    /// Generates an in-memory offline fallback hybrid search response when the downstream Python
    /// microservice is unreachable or circuit is Open.
    /// </summary>
    /// <param name="query">Original query.</param>
    /// <param name="tenantId">Tenant identifier.</param>
    /// <returns>Graceful fallback search results.</returns>
    public static HybridSearchResponseDto CreateOfflineFallbackSearchResponse(string query, string tenantId)
    {
        return new HybridSearchResponseDto
        {
            Query = query,
            TenantId = tenantId,
            Results = new List<FusedDocumentDto>
            {
                new()
                {
                    ChunkId = "offline_fallback_chk_001",
                    DocumentId = "doc_offline_cached_baseline",
                    Content = $"[Offline Fallback Mode] The system is currently operating in disconnected cached mode. Your query '{query}' has been recorded for vector re-indexing upon service restoration.",
                    Page = 1,
                    RrfScore = 0.016666666666666666,
                    DenseRank = null,
                    SparseRank = 1,
                    Metadata = new Dictionary<string, object>
                    {
                        ["is_fallback"] = true,
                        ["offline_cached_at"] = DateTime.UtcNow.ToString("O")
                    }
                }
            }
        };
    }

    /// <summary>
    /// Generates an in-memory offline fallback RAG response when LLM inference is unreachable.
    /// </summary>
    /// <param name="query">Original user question.</param>
    /// <param name="tenantId">Tenant scope.</param>
    /// <returns>Degraded fallback RAG envelope.</returns>
    public static RagQueryResponseDto CreateOfflineFallbackRagResponse(string query, string tenantId)
    {
        return new RagQueryResponseDto
        {
            Query = query,
            TenantId = tenantId,
            SynthesizedResponse = "The enterprise AI Inference service is currently offline or undergoing transient recovery (Circuit Breaker active). Live synthesis is temporarily paused; please review cached documentation or retry shortly.",
            Citations = new List<CitationMetadataDto>(),
            RetrievedDocuments = new List<FusedDocumentDto>(),
            ModelUsed = "offline-circuit-breaker-fallback",
            LatencyMs = 1.2,
            Provider = "EnterpriseApi Gateway Fallback Provider"
        };
    }

    /// <summary>
    /// Generates a local fallback ingestion acknowledgment for asynchronous queueing when microservice is down.
    /// </summary>
    /// <param name="docId">Document GUID.</param>
    /// <param name="tenantId">Tenant identifier.</param>
    /// <returns>Queued ingestion confirmation.</returns>
    public static DocumentIngestionResponseDto CreateOfflineQueuedIngestionResponse(string docId, string tenantId)
    {
        return new DocumentIngestionResponseDto
        {
            Message = "AI microservice is currently unreachable. Document accepted and buffered in local retry queue.",
            DocumentId = docId,
            TenantId = tenantId,
            ChunksIndexed = 0,
            TotalTenantVectorCount = -1
        };
    }

    // =========================================================================================
    // SECTION 9: SIMULATED HTTP MESSAGE HANDLER FOR DETERMINISTIC UNIT & INTEGRATION TESTING
    // =========================================================================================

    /// <summary>
    /// Configurable mock HTTP message handler that intercepts HttpClient requests and returns
    /// pre-configured simulated responses, transient failures, or circuit breaker trips.
    /// </summary>
    public class MockAiServiceHttpMessageHandler : HttpMessageHandler
    {
        private int _requestCount;
        private readonly List<HttpRequestMessage> _recordedRequests = new();

        /// <summary>
        /// Gets the total count of requests processed by this mock handler.
        /// </summary>
        public int RequestCount => _requestCount;

        /// <summary>
        /// Gets a read-only list of all intercepted request objects for assertions.
        /// </summary>
        public IReadOnlyList<HttpRequestMessage> RecordedRequests => _recordedRequests;

        /// <summary>
        /// Controls how many times a transient 503 error should be emitted before succeeding.
        /// Ideal for verifying retry backoff policies.
        /// </summary>
        public int FailuresBeforeSuccess { get; set; } = 0;

        /// <summary>
        /// Custom handler function allowing custom request routing.
        /// </summary>
        public Func<HttpRequestMessage, Task<HttpResponseMessage>>? CustomHandler { get; set; }

        /// <summary>
        /// Simulated simulated latency delay.
        /// </summary>
        public TimeSpan SimulatedLatency { get; set; } = TimeSpan.Zero;

        /// <inheritdoc />
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref _requestCount);
            _recordedRequests.Add(request);

            if (SimulatedLatency > TimeSpan.Zero)
            {
                await Task.Delay(SimulatedLatency, cancellationToken);
            }

            // 1. Check if configured to simulate transient failures for retry policy testing
            if (_requestCount <= FailuresBeforeSuccess)
            {
                var errorResponse = new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
                {
                    Content = new StringContent(
                        Error_Http_503_CircuitBreakerOpen_Json,
                        Encoding.UTF8,
                        "application/json")
                };
                errorResponse.Headers.Add("X-Correlation-ID", DefaultCorrelationId);
                return errorResponse;
            }

            // 2. Delegate to custom handler if supplied
            if (CustomHandler != null)
            {
                return await CustomHandler(request);
            }

            // 3. Default route dispatching based on request path
            var path = request.RequestUri?.AbsolutePath ?? string.Empty;

            if (path.EndsWith("/health", StringComparison.OrdinalIgnoreCase))
            {
                return CreateJsonResponse(HttpStatusCode.OK, HealthResponse_Healthy_Json);
            }

            if (path.EndsWith("/api/v1/ingest", StringComparison.OrdinalIgnoreCase))
            {
                return CreateJsonResponse(HttpStatusCode.Accepted, IngestResponse_Doc01_CragArchitecture_Json);
            }

            if (path.EndsWith("/api/v1/search/hybrid", StringComparison.OrdinalIgnoreCase))
            {
                return CreateJsonResponse(HttpStatusCode.OK, SearchResponse_Query01_Crag_Json);
            }

            if (path.EndsWith("/api/v1/rag/query", StringComparison.OrdinalIgnoreCase))
            {
                return CreateJsonResponse(HttpStatusCode.OK, RagResponse_Query01_Crag_Json);
            }

            // Fallback 404 for unmapped mock routes
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent(
                    $$"""{"detail": "Mock route not found: {{path}}"}""",
                    Encoding.UTF8,
                    "application/json")
            };
        }

        private static HttpResponseMessage CreateJsonResponse(HttpStatusCode statusCode, string json)
        {
            var response = new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            response.Headers.Add("X-Correlation-ID", DefaultCorrelationId);
            return response;
        }
    }

    /// <summary>
    /// Factory helper to instantiate a pre-configured HttpClient wired to the <see cref="MockAiServiceHttpMessageHandler"/>.
    /// </summary>
    /// <param name="failuresBeforeSuccess">Number of transient failures to produce before returning HTTP 200.</param>
    /// <param name="customHandler">Optional custom routing delegate.</param>
    /// <returns>Configured HttpClient instance for unit tests.</returns>
    public static HttpClient CreateMockHttpClient(
        int failuresBeforeSuccess = 0,
        Func<HttpRequestMessage, Task<HttpResponseMessage>>? customHandler = null)
    {
        var handler = new MockAiServiceHttpMessageHandler
        {
            FailuresBeforeSuccess = failuresBeforeSuccess,
            CustomHandler = customHandler
        };

        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost:8000/"),
            Timeout = TimeSpan.FromSeconds(30)
        };

        client.DefaultRequestHeaders.Add("X-Client-Service", "EnterpriseApi-Gateway-MockClient");
        return client;
    }

    // =========================================================================================
    // SECTION 10: MASSIVE BATCH FIXTURE SETS FOR RETRIEVAL BENCHMARKS & STRESS TESTING
    // =========================================================================================

    /// <summary>
    /// Generates a massive suite of 20 distinct enterprise research documents across tenants
    /// for comprehensive bulk synchronization testing, benchmark evaluation, and stress loads.
    /// </summary>
    public static IReadOnlyList<(Guid DocumentId, string Title, string Content, IDictionary<string, object>? Metadata)> GetMassiveDocumentBatchFixtures()
    {
        var list = new List<(Guid, string, string, IDictionary<string, object>?)>
        {
            (
                Guid.Parse("a0000001-0001-0001-0001-000000000001"),
                "LangGraph State Machine Evaluator Deep-Dive",
                "LangGraph orchestrates cyclical workflows for corrective RAG. Nodes include retrieve, grade_documents, transform_query, and generate. When grade_documents evaluates candidate relevance to fall below threshold 0.82, execution edges transition to transform_query.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "Architecture", ["importance"] = 9.8 }
            ),
            (
                Guid.Parse("a0000002-0002-0002-0002-000000000002"),
                "BM25Okapi Term Frequency & Document Length Normalization",
                "BM25Okapi scores document relevance using inverse document frequency (IDF) with parameters k1=1.5 and b=0.75. The b parameter penalizes bloated documents while k1 prevents single term over-saturation.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "InformationRetrieval", ["importance"] = 9.2 }
            ),
            (
                Guid.Parse("a0000003-0003-0003-0003-000000000003"),
                "ChromaDB HNSW Indexing & Cosine Distance Normalization",
                "Hierarchical Navigable Small World (HNSW) graphs in ChromaDB enable sub-millisecond approximate nearest neighbor lookups. Cosine distance is normalized using Euclidean vector norms to yield stable dot-product projections.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "VectorSearch", ["importance"] = 9.4 }
            ),
            (
                Guid.Parse("a0000004-0004-0004-0004-000000000004"),
                "Reciprocal Rank Fusion k=60 Calibration Analysis",
                "Reciprocal Rank Fusion computes composite relevance score RRF(d) = sum(1 / (k + rank_i(d))). Setting k=60 dampens the advantage of top ranks, ensuring balanced candidate fusion between sparse lexical and dense semantic retrievals.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "RRF", ["importance"] = 9.9 }
            ),
            (
                Guid.Parse("a0000005-0005-0005-0005-000000000005"),
                "Entity Framework Core Multi-Tenant Query Filter Hardening",
                "EF Core ModelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _currentTenantService.TenantId) attaches SQL WHERE clauses to every executed expression tree, guaranteeing database-level tenancy partitioning.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "DataSecurity", ["importance"] = 9.7 }
            ),
            (
                Guid.Parse("a0000006-0006-0006-0006-000000000006"),
                "Zero-Trust Mutual TLS Interservice Mesh Topology",
                "Within the Kubernetes cluster, Envoy sidecars terminate mTLS. Service certificates are provisioned by cert-manager and automatically renewed every 90 days with cryptographic thumbprint verification.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "ZeroTrust", ["importance"] = 9.1 }
            ),
            (
                Guid.Parse("a0000007-0007-0007-0007-000000000007"),
                "Distributed Tracing with Correlation IDs in Microservices",
                "The CorrelationIdDelegatingHandler enforces W3C trace context standards. Headers X-Correlation-ID are propagated downstream to RabbitMQ message headers and Python FastAPI request context variables.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "Observability", ["importance"] = 8.9 }
            ),
            (
                Guid.Parse("a0000008-0008-0008-0008-000000000008"),
                "Circuit Breaker Fail-Fast State Machine Implementation",
                "The circuit breaker maintains Closed, Open, and Half-Open states. Upon encountering 5 consecutive transient failures (5xx, 429), it opens for 15 seconds, preventing thundering herds and cascading worker exhaustion.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "Resilience", ["importance"] = 9.6 }
            ),
            (
                Guid.Parse("a0000009-0009-0009-0009-000000000009"),
                "Decorrelated Full Jitter Retry Strategy for High Concurrency",
                "Fixed and linear backoff algorithms cause periodic retry spikes. Full jitter randomizes delays between 0 and the exponential maximum: delay = random(0, min(maxDelay, baseDelay * 2^attempt)), smoothing request spikes.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "Networking", ["importance"] = 9.0 }
            ),
            (
                Guid.Parse("a0000010-000a-000a-000a-000000000010"),
                "SocketsHttpHandler Connection Lifetime and DNS Drift",
                "PooledConnectionLifetime defaults to infinite, causing DNS changes during blue-green deployments to be ignored. Setting PooledConnectionLifetime to 15 minutes forces DNS re-resolution while reusing open sockets.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "HttpClient", ["importance"] = 9.3 }
            ),
            (
                Guid.Parse("a0000011-000b-000b-000b-000000000011"),
                "HIPAA Compliance & Protected Health Information Handling",
                "All medical records and clinical annotations must undergo tokenization before ingestion. Plaintext PII is redacted using regular expression NER evaluators prior to dense vector embedding.",
                new Dictionary<string, object> { ["tenant"] = TenantHealthCare, ["category"] = "Compliance", ["importance"] = 9.9 }
            ),
            (
                Guid.Parse("a0000012-000c-000c-000c-000000000012"),
                "PCI-DSS Financial Data Tokenization Standards",
                "Primary Account Numbers (PAN) and CVV codes are strictly barred from vector storage. Card data is tokenized using deterministic vault tokens, with zero plain text stored in sparse indices.",
                new Dictionary<string, object> { ["tenant"] = TenantBetaFinancial, ["category"] = "FinancialSecurity", ["importance"] = 9.8 }
            ),
            (
                Guid.Parse("a0000013-000d-000d-000d-000000000013"),
                "FedRAMP Moderate Cloud Security Controls Specification",
                "FIPS 140-3 validated cryptographic modules are required for all data at rest and data in transit. Secret keys must be managed in dedicated hardware security modules (HSM) with audited access logs.",
                new Dictionary<string, object> { ["tenant"] = TenantGovDefense, ["category"] = "FederalCompliance", ["importance"] = 10.0 }
            ),
            (
                Guid.Parse("a0000014-000e-000e-000e-000000000014"),
                "Groq LPU Hardware Acceleration for 70B Parameter Models",
                "Groq Language Processing Units deliver unprecedented tokens-per-second throughput by removing speculative decoding overhead. Tensor cores execute static compiler scheduled graphs with zero memory stalls.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "Hardware", ["importance"] = 9.5 }
            ),
            (
                Guid.Parse("a0000015-000f-000f-000f-000000000015"),
                "Chunking Strategies for Complex Structured Enterprise Documents",
                "Recursive character text splitters with overlap (chunk_size=1000, chunk_overlap=200) maintain sentence boundaries. Markdown headers are preserved across chunk splits to retain semantic hierarchies.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "Preprocessing", ["importance"] = 8.8 }
            ),
            (
                Guid.Parse("a0000016-0010-0010-0010-000000000016"),
                "Asynchronous Event-Driven Messaging with RabbitMQ",
                "Document upload triggers a DocumentUploadedEvent published to RabbitMQ exchange 'enterprise.events'. The Python AI service consumes from queue 'ai.document.ingestion' with dead-letter retry routing.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "EventDriven", ["importance"] = 9.4 }
            ),
            (
                Guid.Parse("a0000017-0011-0011-0011-000000000017"),
                "Rate Limiting and Sliding Window Partitioning in ASP.NET 8",
                "ASP.NET Core 8 RateLimiter partitions requests by tenant identifier. Tenants are restricted to 20 requests per minute with a queue limit of 5. Excess requests receive HTTP 429 Too Many Requests.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "RateLimiting", ["importance"] = 9.1 }
            ),
            (
                Guid.Parse("a0000018-0012-0012-0012-000000000018"),
                "Content Security Policy and Security Headers Enforcement",
                "SecurityHeadersMiddleware encloses every HTTP response with HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and strict Content-Security-Policy directives to eliminate XSS vectors.",
                new Dictionary<string, object> { ["tenant"] = TenantAlphaEnterprise, ["category"] = "WebSecurity", ["importance"] = 9.0 }
            ),
            (
                Guid.Parse("a0000019-0013-0013-0013-000000000019"),
                "Recall@K and Mean Reciprocal Rank (MRR) Benchmark Metrics",
                "Retrieval accuracy is measured against ground-truth datasets using Recall@5 and MRR@10. Reciprocal Rank Fusion improves Recall@5 from 78.4% to 94.2% compared to standalone vector search.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "Evaluation", ["importance"] = 9.7 }
            ),
            (
                Guid.Parse("a0000020-0014-0014-0014-000000000020"),
                "Automated Self-Correction via Iterative Query Rewriting",
                "When candidate density falls into the ambiguous region (0.60 <= confidence < 0.82), CRAG initiates query rewriting using LLM few-shot templates, expanding synonyms and clarifying enterprise acronyms.",
                new Dictionary<string, object> { ["tenant"] = TenantSkitAiLabs, ["category"] = "CRAG", ["importance"] = 9.6 }
            )
        };

        return list;
    }

    /// <summary>
    /// Generates a comprehensive dictionary of 15 simulated hybrid search queries and candidate results
    /// for comprehensive testing of RRF re-ranking and retrieval evaluation.
    /// </summary>
    public static IReadOnlyDictionary<string, HybridSearchResponseDto> GetSimulatedHybridSearchResultsMap()
    {
        return new Dictionary<string, HybridSearchResponseDto>(StringComparer.OrdinalIgnoreCase)
        {
            ["crag"] = SearchResponseDto_Query01_Crag,
            ["multi-tenancy"] = new HybridSearchResponseDto
            {
                Query = "multi-tenancy isolation",
                TenantId = TenantSkitAiLabs,
                Results = new List<FusedDocumentDto>
                {
                    new()
                    {
                        ChunkId = "sec-mt-chk-1",
                        DocumentId = "doc-sec-multitenancy-002",
                        Content = "Multi-tenant data isolation is guaranteed through EF Core Global Query Filters and ChromaDB vector metadata partition keys.",
                        Page = 1,
                        RrfScore = 0.032,
                        DenseRank = 1,
                        SparseRank = 1
                    }
                }
            },
            ["rrf"] = new HybridSearchResponseDto
            {
                Query = "Reciprocal Rank Fusion formula",
                TenantId = TenantSkitAiLabs,
                Results = new List<FusedDocumentDto>
                {
                    new()
                    {
                        ChunkId = "crag-rrf-chk-2",
                        DocumentId = "doc-crag-arch-001",
                        Content = "Candidates are unified using Reciprocal Rank Fusion with smoothing parameter k=60: RRF_Score = Sum(1 / (k + rank)).",
                        Page = 1,
                        RrfScore = 0.0327,
                        DenseRank = 1,
                        SparseRank = 1
                    }
                }
            },
            ["circuit-breaker"] = new HybridSearchResponseDto
            {
                Query = "circuit breaker status",
                TenantId = TenantAlphaEnterprise,
                Results = new List<FusedDocumentDto>
                {
                    new()
                    {
                        ChunkId = "resilience-cb-chk-1",
                        DocumentId = "doc-resilience-008",
                        Content = "Circuit breaker maintains Closed, Open, and Half-Open states to fail fast during transient microservice outages.",
                        Page = 1,
                        RrfScore = 0.0315,
                        DenseRank = 1,
                        SparseRank = 2
                    }
                }
            },
            ["bm25"] = new HybridSearchResponseDto
            {
                Query = "bm25 parameters k1 b",
                TenantId = TenantSkitAiLabs,
                Results = new List<FusedDocumentDto>
                {
                    new()
                    {
                        ChunkId = "ir-bm25-chk-1",
                        DocumentId = "doc-bm25-002",
                        Content = "BM25Okapi scores document relevance using inverse document frequency with parameters k1=1.5 and b=0.75.",
                        Page = 1,
                        RrfScore = 0.0322,
                        DenseRank = 2,
                        SparseRank = 1
                    }
                }
            }
        };
    }

    /// <summary>
    /// Generates a suite of 10 end-to-end RAG inquiry scenarios covering high-confidence grounding,
    /// cross-document citation synthesis, and CRAG fallback rejections.
    /// </summary>
    public static IReadOnlyList<(string Query, string TenantId, RagQueryResponseDto Response)> GetSimulatedRagQueryScenarios()
    {
        return new List<(string, string, RagQueryResponseDto)>
        {
            ("How does Corrective RAG prevent hallucinations?", TenantSkitAiLabs, RagResponseDto_Query01_Crag),
            ("Explain EF Core query filters for tenant isolation.", TenantSkitAiLabs, new RagQueryResponseDto
            {
                Query = "Explain EF Core query filters for tenant isolation.",
                TenantId = TenantSkitAiLabs,
                SynthesizedResponse = "EF Core global query filters automatically append WHERE TenantId = @TenantId to all generated SQL queries, guaranteeing zero cross-tenant leakage.",
                Citations = new List<CitationMetadataDto>
                {
                    new() { DocumentId = "doc-sec-multitenancy-002", Page = 1, Snippet = "EF Core Global Query Filters ensure row-level tenancy.", Score = 0.95 }
                },
                ModelUsed = "llama-3.3-70b-versatile",
                LatencyMs = 278.4,
                Provider = "Groq LPU Engine"
            }),
            ("What is the smoothing constant k in RRF?", TenantSkitAiLabs, new RagQueryResponseDto
            {
                Query = "What is the smoothing constant k in RRF?",
                TenantId = TenantSkitAiLabs,
                SynthesizedResponse = "The smoothing constant k in Reciprocal Rank Fusion is set to 60 (RRF_Score = Sum(1 / (60 + rank))), which prevents top ranks from dominating.",
                Citations = new List<CitationMetadataDto>
                {
                    new() { DocumentId = "doc-crag-arch-001", Page = 1, Snippet = "Candidates are unified using RRF with k=60.", Score = 0.97 }
                },
                ModelUsed = "llama-3.3-70b-versatile",
                LatencyMs = 245.1,
                Provider = "Groq LPU Engine"
            }),
            ("What are the seccomp execution constraints for the Python math sandbox?", TenantSkitAiLabs, new RagQueryResponseDto
            {
                Query = "What are the seccomp execution constraints for the Python math sandbox?",
                TenantId = TenantSkitAiLabs,
                SynthesizedResponse = "The Python math sandbox enforces a 0.5 CPU quota, 256MB memory ceiling, 1500ms wall-clock timeout, zero egress networking, and strict blacklisting of os, sys, and subprocess modules.",
                Citations = new List<CitationMetadataDto>
                {
                    new() { DocumentId = "doc-math-sandbox-005", Page = 1, Snippet = "CPU quota 0.5 cores, memory 256MB, timeout 1500ms, zero egress.", Score = 0.98 }
                },
                ModelUsed = "llama-3.3-70b-versatile",
                LatencyMs = 310.2,
                Provider = "Groq LPU Engine"
            }),
            ("What is the speed of light in deep water?", TenantSkitAiLabs, new RagQueryResponseDto
            {
                Query = "What is the speed of light in deep water?",
                TenantId = TenantSkitAiLabs,
                SynthesizedResponse = "I cannot provide an answer because this inquiry is outside the scope of the private enterprise engineering corpus. Under CRAG rules, unsupported claims are rejected.",
                Citations = new List<CitationMetadataDto>(),
                ModelUsed = "llama-3.3-70b-versatile",
                LatencyMs = 98.4,
                Provider = "Groq LPU Engine (CRAG Rejection)"
            })
        };
    }
}
