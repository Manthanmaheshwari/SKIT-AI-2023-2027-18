"""
Service module for handling sparse keyword searches using the BM25 algorithm.

This module provides the SparseKeywordService class, responsible for tokenizing
document chunks and executing exact-match keyword indexing to ensure precision
for specific terminology, acronyms, and alphanumeric identifiers.
"""

import logging
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi

from services.rrf_service import RankedDocument

logger = logging.getLogger("ai_service.sparse_service")


class SparseKeywordService:
    """
    Service for executing sparse keyword retrieval using BM25Okapi.

    This service complements dense vector search by providing exact-match capabilities.
    """

    def __init__(self):
        """
        Initialize the SparseKeywordService.
        """
        self.corpus_chunks: List[str] = []
        self.corpus_metadata: List[Dict[str, Any]] = []
        self.chunk_id_map: Dict[str, int] = {}
        self.bm25: Optional[BM25Okapi] = None

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize input text into lowercase string tokens.

        Args:
            text: The raw string to tokenize.

        Returns:
            A list of tokenized string components.
        """
        return text.lower().split()

    def add_documents(self, chunks: List[str], metadata: List[Dict[str, Any]]) -> None:
        """
        Incrementally add document chunks to the sparse corpus and rebuild the BM25 index.

        Args:
            chunks: List of chunk text strings.
            metadata: List of metadata dicts corresponding to each chunk.
        """
        if not chunks:
            return

        for chunk_text, meta in zip(chunks, metadata):
            chunk_id = meta.get("chunk_id") or f"{meta.get('tenant_id')}_{meta.get('document_id')}_{len(self.corpus_chunks)}"
            if chunk_id in self.chunk_id_map:
                # Update existing chunk
                idx = self.chunk_id_map[chunk_id]
                self.corpus_chunks[idx] = chunk_text
                self.corpus_metadata[idx] = meta
            else:
                self.chunk_id_map[chunk_id] = len(self.corpus_chunks)
                self.corpus_chunks.append(chunk_text)
                self.corpus_metadata.append(meta)

        tokenized_corpus = [self._tokenize(chunk) for chunk in self.corpus_chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
        logger.info(
            "Sparse index updated with %d chunks. Total indexed chunks: %d.",
            len(chunks),
            len(self.corpus_chunks),
        )

    def index_corpus(self, chunks: List[str], metadata: List[Dict[str, Any]]) -> None:
        """
        Index a given corpus of text chunks using BM25 (replaces existing index).

        Args:
            chunks: A list of string chunks representing the document content.
            metadata: A list of metadata dictionaries corresponding to each chunk.
        """
        self.corpus_chunks = []
        self.corpus_metadata = []
        self.chunk_id_map = {}
        self.add_documents(chunks, metadata)

    def search(self, query: str, tenant_id: str, top_k: int = 5) -> List[RankedDocument]:
        """
        Execute a sparse keyword search against the indexed corpus with tenant filtering.

        Args:
            query: The search string.
            tenant_id: The tenant identifier to enforce logical isolation filtering.
            top_k: The number of top results to return.

        Returns:
            A list of RankedDocument candidates matching the query.
        """
        if not self.bm25 or not query or not query.strip():
            return []

        tokenized_query = self._tokenize(query.strip())
        if not tokenized_query:
            return []

        doc_scores = self.bm25.get_scores(tokenized_query)

        scored_candidates = []
        for i, score in enumerate(doc_scores):
            meta = self.corpus_metadata[i]
            # Multi-tenant isolation filter: only evaluate chunks belonging to the requesting tenant
            if str(meta.get("tenant_id")) == str(tenant_id) and score > 0.0001:
                scored_candidates.append({
                    "content": self.corpus_chunks[i],
                    "metadata": meta,
                    "score": float(score),
                })

        # Sort descending by BM25 score
        sorted_results = sorted(scored_candidates, key=lambda x: x["score"], reverse=True)
        top_candidates = sorted_results[:top_k]

        ranked_docs: List[RankedDocument] = []
        for rank_idx, item in enumerate(top_candidates, start=1):
            meta = item["metadata"]
            cid = str(meta.get("chunk_id") or f"bm25_{rank_idx}")
            doc_id = str(meta.get("document_id") or cid)

            ranked_docs.append(
                RankedDocument(
                    id=cid,
                    document_id=doc_id,
                    chunk_id=cid,
                    content=item["content"],
                    score=round(item["score"], 4),
                    rank=rank_idx,
                    source="bm25_sparse",
                    metadata=dict(meta),
                )
            )

        logger.info(
            "Sparse BM25 search retrieved %d candidates for tenant '%s' (top score: %.4f).",
            len(ranked_docs),
            tenant_id,
            ranked_docs[0].score if ranked_docs else 0.0,
        )
        return ranked_docs

