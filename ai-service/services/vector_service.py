"""
Service module for handling vector embeddings and ChromaDB integration.

This module provides the VectorEmbeddingService class, responsible for taking
raw document text, chunking it semantically using LangChain, generating embeddings,
and securely storing them in a multi-tenant aware ChromaDB collection.
"""

from typing import Dict, Any, Optional, List
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

class VectorEmbeddingService:
    """
    Service for document chunking, embedding generation, and vector storage.

    This service ensures that all ingested documents are processed into manageable
    semantic chunks and stored with strict tenant isolation metadata.
    """

    def __init__(self, persist_directory: str = "./chroma_data"):
        """
        Initialize the VectorEmbeddingService with ChromaDB and text splitters.

        Args:
            persist_directory: Local path for ChromaDB persistence.
        """
        self.persist_directory = persist_directory
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    def process_and_store_document(
        self, 
        tenant_id: str, 
        document_id: str, 
        content: str, 
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Process document text into semantic chunks and store them in ChromaDB.

        This method strictly enforces multi-tenancy by injecting the tenant_id
        into the metadata of every single generated chunk before storage.

        Args:
            tenant_id: The unique identifier of the tenant owning the document.
            document_id: The unique identifier for the document being processed.
            content: The raw text content of the document.
            additional_metadata: Optional dictionary of extra metadata to append.
        """
        if not content:
            return

        chunks: List[str] = self.text_splitter.split_text(content)
        
        base_metadata: Dict[str, Any] = {
            "tenant_id": tenant_id, 
            "document_id": document_id
        }
        
        if additional_metadata:
            # Ensure we do not overwrite the mandatory isolation fields
            merged_metadata = additional_metadata.copy()
            merged_metadata.update(base_metadata)
            base_metadata = merged_metadata
            
        metadatas: List[Dict[str, Any]] = [base_metadata.copy() for _ in chunks]

        vectorstore = Chroma(
            collection_name="global_enterprise_documents",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
