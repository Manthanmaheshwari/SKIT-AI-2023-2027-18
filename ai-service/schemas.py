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
