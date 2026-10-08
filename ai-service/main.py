"""
Main entry point for the AI Microservice API.

This module initializes the FastAPI application, configures the necessary
middlewares, and defines the primary endpoints for document ingestion and
Retrieval-Augmented Generation (RAG) processes.
"""

from fastapi import FastAPI, HTTPException, status
from schemas import DocumentIngestionRequest, HybridSearchRequest
from services.vector_service import VectorEmbeddingService
from services.sparse_service import SparseKeywordService
from services.rrf_service import ReciprocalRankFusionService

app = FastAPI(
    title="AI Inference Engine API",
    description="Enterprise Multi-Tenant AI Research Assistant Platform - ML Microservice",
    version="1.0.0"
)

# Initialize the service singletons
vector_service = VectorEmbeddingService()
sparse_service = SparseKeywordService()
rrf_service = ReciprocalRankFusionService()

@app.post("/api/v1/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_document(request: DocumentIngestionRequest):
    """
    Endpoint to ingest a document for vector embedding and indexing.

    Args:
        request: The document ingestion request containing tenant_id and content.

    Returns:
        A dictionary containing the status of the ingestion process.
    """
    try:
        # In a production environment, this would publish to a RabbitMQ queue.
        # For the scope of this implementation, we synchronously process the pipeline.
        vector_service.process_and_store_document(
            tenant_id=request.tenant_id,
            document_id=request.document_id,
            content=request.content,
            additional_metadata=request.metadata
        )
        return {
            "message": "Document ingestion processed successfully.", 
            "document_id": request.document_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint to verify service availability.

    Returns:
        A dictionary with the service status.
    """
    return {"status": "healthy"}

@app.post("/api/v1/search/hybrid", status_code=status.HTTP_200_OK)
async def hybrid_search(request: HybridSearchRequest):
    """
    Endpoint to execute a hybrid search combining dense and sparse retrievals
    via Reciprocal Rank Fusion (RRF).

    Args:
        request: The hybrid search request containing tenant_id and query.

    Returns:
        A dictionary containing the fused and ranked search results.
    """
    try:
        # In a fully integrated system, the dense results would be queried from ChromaDB
        # This acts as an integration point placeholder for VectorEmbeddingService.search()
        dense_results = []
        
        # Execute Sparse Keyword Search
        sparse_results = sparse_service.search(
            query=request.query, 
            tenant_id=request.tenant_id, 
            top_k=request.top_k
        )
        
        # Apply Reciprocal Rank Fusion (RRF)
        fused_results = rrf_service.fuse_results(
            dense_results=dense_results, 
            sparse_results=sparse_results, 
            top_k=request.top_k
        )

        return {
            "query": request.query,
            "tenant_id": request.tenant_id,
            "results": fused_results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )
