"""
Service module for handling vector embeddings and ChromaDB integration.

This module provides the VectorEmbeddingService class, responsible for taking
raw document text, chunking it semantically, generating dense embeddings locally
using ChromaDB's ONNX embedding engine, and securely storing/retrieving them with
strict multi-tenant isolation.
"""

import os
import logging
from typing import Dict, Any, Optional, List, Tuple
import chromadb
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter

from services.rrf_service import RankedDocument

logger = logging.getLogger("ai_service.vector_service")


class VectorEmbeddingService:
    """
    Enterprise service for semantic document chunking, dense embedding generation,
    and multi-tenant vector storage/search via ChromaDB.
    """

    def __init__(self, persist_directory: str = "./chroma_data"):
        """
        Initialize the VectorEmbeddingService with ChromaDB and semantic text splitters.

        Args:
            persist_directory: Local path for ChromaDB persistence.
        """
        self.persist_directory = persist_directory
        os.makedirs(self.persist_directory, exist_ok=True)

        try:
            self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
            logger.info("ChromaDB DefaultEmbeddingFunction (ONNX all-MiniLM-L6-v2) successfully initialized.")
        except Exception as e:
            logger.warning("DefaultEmbeddingFunction initialization warning: %s", str(e))
            self.embedding_function = None

        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection_name = "global_enterprise_documents"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"},
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            length_function=len,
        )
        logger.info(
            "VectorEmbeddingService initialized with collection '%s' (total items: %d).",
            self.collection_name,
            self.collection.count(),
        )

    def process_and_store_document(
        self,
        tenant_id: str,
        document_id: str,
        content: str,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Process document text into semantic chunks and store them in ChromaDB.

        This method strictly enforces multi-tenancy by injecting tenant_id and document_id
        into the metadata of every single generated chunk before storage.

        Args:
            tenant_id: The unique identifier of the tenant owning the document.
            document_id: The unique identifier for the document being processed.
            content: The raw text content of the document.
            additional_metadata: Optional dictionary of extra metadata to append.

        Returns:
            Tuple of (chunks, metadatas) for downstream indexing in sparse search.
        """
        if not content or not content.strip():
            logger.warning("Empty content provided for document '%s' (tenant '%s').", document_id, tenant_id)
            return [], []

        raw_chunks = self.text_splitter.split_text(content.strip())
        if not raw_chunks:
            raw_chunks = [content.strip()]

        chunks: List[str] = []
        ids: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        base_meta = dict(additional_metadata or {})
        base_meta.update({
            "tenant_id": str(tenant_id),
            "document_id": str(document_id),
        })

        for i, chunk_text in enumerate(raw_chunks, start=1):
            chunk_id = f"{tenant_id}_{document_id}_chunk_{i:04d}"
            chunk_meta = dict(base_meta)
            chunk_meta.update({
                "chunk_id": chunk_id,
                "chunk_index": i,
                "page": base_meta.get("page", 1),
            })
            # Ensure all metadata values are primitive types supported by ChromaDB
            clean_meta = {}
            for k, v in chunk_meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)

            chunks.append(chunk_text)
            ids.append(chunk_id)
            metadatas.append(clean_meta)

        self.collection.upsert(
            ids=ids,
            documents=chunks,
            metadatas=metadatas,
        )

        logger.info(
            "Successfully upserted %d vector chunks for document '%s' (tenant '%s'). Total collection count: %d.",
            len(chunks),
            document_id,
            tenant_id,
            self.collection.count(),
        )
        return chunks, metadatas

    def search(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5,
    ) -> List[RankedDocument]:
        """
        Execute dense vector similarity search against the ChromaDB collection
        with strict multi-tenant logical isolation enforcement.

        Args:
            query: The search inquiry text.
            tenant_id: Tenant identifier to enforce isolation.
            top_k: Maximum number of top candidates to retrieve.

        Returns:
            List of RankedDocument candidates sorted by similarity.
        """
        if not query or not query.strip():
            return []

        try:
            total_items = self.collection.count()
            if total_items == 0:
                return []

            # Retrieve with strict tenant_id filter
            n_results = min(top_k, total_items)
            results = self.collection.query(
                query_texts=[query.strip()],
                n_results=n_results,
                where={"tenant_id": str(tenant_id)},
            )

            ranked_docs: List[RankedDocument] = []
            if not results or not results.get("ids") or not results["ids"][0]:
                return []

            doc_ids = results["ids"][0]
            docs = results["documents"][0] if results.get("documents") else []
            metas = results["metadatas"][0] if results.get("metadatas") else []
            distances = results["distances"][0] if results.get("distances") else []

            for rank_idx, (cid, doc_content) in enumerate(zip(doc_ids, docs), start=1):
                meta = metas[rank_idx - 1] if rank_idx - 1 < len(metas) else {}
                dist = distances[rank_idx - 1] if rank_idx - 1 < len(distances) else 0.5
                # Chroma cosine distance ranges from 0 (identical) to 2 (opposite)
                similarity_score = max(0.0, round(1.0 - (dist / 2.0), 4))

                ranked_docs.append(
                    RankedDocument(
                        id=str(cid),
                        document_id=str(meta.get("document_id") or cid),
                        chunk_id=str(meta.get("chunk_id") or cid),
                        content=str(doc_content),
                        score=similarity_score,
                        rank=rank_idx,
                        source="chromadb_dense",
                        metadata=dict(meta),
                    )
                )

            logger.info(
                "Dense search retrieved %d candidates for tenant '%s' (top score: %.4f).",
                len(ranked_docs),
                tenant_id,
                ranked_docs[0].score if ranked_docs else 0.0,
            )
            return ranked_docs

        except Exception as e:
            logger.error("Dense vector search failed: %s", str(e), exc_info=True)
            return []

