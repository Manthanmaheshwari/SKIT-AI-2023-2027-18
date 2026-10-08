"""
Main entry point for the AI Microservice API.

This module initializes the FastAPI application, configures the necessary
middlewares, and defines the primary endpoints for document ingestion and
Retrieval-Augmented Generation (RAG) processes.
"""

from fastapi import FastAPI, HTTPException, status
from schemas import DocumentIngestionRequest
from services.vector_service import VectorEmbeddingService

app = FastAPI(
    title="AI Inference Engine API",
    description="Enterprise Multi-Tenant AI Research Assistant Platform - ML Microservice",
    version="1.0.0"
)

# Initialize the vector service singleton
vector_service = VectorEmbeddingService()

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
