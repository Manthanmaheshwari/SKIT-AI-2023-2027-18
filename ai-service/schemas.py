"""
Pydantic schemas for the AI Microservice API.

This module defines the strict data validation schemas required for API
endpoints, ensuring that all incoming requests adhere to the expected format.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from services.rrf_service import FusedDocument, RankedDocument


class DocumentIngestionRequest(BaseModel):
    """
    Schema representing a request to ingest a document.

    Attributes:
        tenant_id: The unique identifier for the tenant, required for data isolation.
        document_id: The unique identifier for the document.
        content: The raw text content of the document to be ingested.
        metadata: Optional dictionary containing additional document attributes.
    """
    tenant_id: str = Field(..., description="Unique identifier for the tenant to ensure data isolation.")
    document_id: str = Field(..., description="Unique identifier for the document.")
    content: str = Field(..., description="The raw text content to be chunked and embedded.")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional document metadata.")


class HybridSearchRequest(BaseModel):
    """
    Schema representing a hybrid search request.

    Attributes:
        tenant_id: The unique identifier for the tenant, required for data isolation.
        query: The search string to process.
        top_k: The number of top results to return.
    """
    tenant_id: str = Field(..., description="Unique identifier for the tenant to ensure data isolation.")
    query: str = Field(..., description="The query string for the hybrid search.")
    top_k: int = Field(5, description="The maximum number of results to return.")


class HybridSearchResponse(BaseModel):
    """
    Schema representing the hybrid search response containing fused results.

    Attributes:
        query: The search string processed.
        tenant_id: The tenant identifier isolating the retrieved documents.
        results: List of unified and re-ranked candidate documents from RRF.
    """
    query: str = Field(..., description="The query string processed.")
    tenant_id: str = Field(..., description="The tenant identifier isolating the retrieved documents.")
    results: List[FusedDocument] = Field(default_factory=list, description="Fused candidates ranked by RRF score.")


class CitationMetadata(BaseModel):
    """
    Visual citation metadata anchoring synthetic assertions to physical documents and pages.
    """
    document_id: str = Field(..., description="Referenced document identifier.")
    page: int = Field(default=1, description="1-indexed document page number.")
    snippet: str = Field(..., description="Text snippet grounding the conclusion.")
    score: float = Field(default=0.90, description="Relevance or retrieval confidence score.")


class RAGQueryRequest(BaseModel):
    """
    Request model for the complete end-to-end RAG pipeline (Retrieval + Groq Synthesis).
    """
    tenant_id: str = Field(..., description="Multi-tenant boundary identifier.")
    query: str = Field(..., description="User inquiry to be grounded and synthesized.")
    top_k: int = Field(default=5, ge=1, le=20, description="Candidate retrieval ceiling.")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sampling temperature override.")
    max_tokens: Optional[int] = Field(default=None, ge=64, le=4096, description="Maximum output tokens.")


class RAGQueryResponse(BaseModel):
    """
    Response model for the complete end-to-end RAG pipeline.
    """
    query: str = Field(..., description="Original user query.")
    tenant_id: str = Field(..., description="Tenant boundary context.")
    synthesized_response: str = Field(..., description="Grounded answer generated via Groq inference.")
    citations: List[CitationMetadata] = Field(default_factory=list, description="Visual grounding citations.")
    retrieved_documents: List[FusedDocument] = Field(default_factory=list, description="Top fused candidate chunks.")
    model_used: str = Field(..., description="Groq inference model identifier.")
    latency_ms: float = Field(..., description="End-to-end pipeline latency in milliseconds.")
    provider: str = Field(..., description="Inference engine provider.")


class EvaluationRunRequest(BaseModel):
    """
    Request payload to trigger benchmark evaluation on demand.
    """
    top_k: int = Field(default=5, ge=1, le=20, description="Retrieval cutoff ceiling for Recall@K.")
    max_queries: Optional[int] = Field(default=None, ge=1, description="Optional cap on benchmark queries evaluated.")
    tenant_id: str = Field(default="skit-ai-labs", description="Tenant boundary scope.")


class EvaluationSummaryResponse(BaseModel):
    """
    Response payload containing aggregated Recall@K and MRR benchmark results.
    """
    status: str = Field(..., description="Evaluation status.")
    evaluation_timestamp: str = Field(..., description="UTC ISO timestamp.")
    tenant_id: str = Field(..., description="Tenant boundary scope.")
    total_queries_evaluated: int = Field(..., description="Number of queries evaluated.")
    top_k: int = Field(..., description="Recall@K cutoff.")
    global_metrics: Dict[str, Any] = Field(..., description="Aggregated Recall, MRR, and SLA compliance metrics.")
    domain_breakdown: List[Dict[str, Any]] = Field(default_factory=list, description="Domain-segmented metric breakdown.")
    benchmark_execution_time_seconds: float = Field(..., description="Benchmark runtime in seconds.")

