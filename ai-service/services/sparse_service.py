"""
Service module for handling sparse keyword searches using the BM25 algorithm.

This module provides the SparseKeywordService class, responsible for tokenizing
document chunks and executing exact-match keyword indexing to ensure precision
for specific terminology, acronyms, and alphanumeric identifiers.
"""

from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

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
        self.bm25: BM25Okapi = None

    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize input text into lowercase string tokens.

        Args:
            text: The raw string to tokenize.

        Returns:
            A list of tokenized string components.
        """
        # Simple whitespace tokenizer designed for alphanumeric exact matching
        return text.lower().split()

    def index_corpus(self, chunks: List[str], metadata: List[Dict[str, Any]]) -> None:
        """
        Index a given corpus of text chunks using BM25.

        Args:
            chunks: A list of string chunks representing the document content.
            metadata: A list of metadata dictionaries corresponding to each chunk.
        """
        self.corpus_chunks = chunks
        self.corpus_metadata = metadata
        tokenized_corpus = [self._tokenize(chunk) for chunk in self.corpus_chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, tenant_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Execute a sparse keyword search against the indexed corpus.

        Args:
            query: The search string.
            tenant_id: The tenant identifier to enforce logical isolation filtering.
            top_k: The number of top results to return.

        Returns:
            A list of dictionaries containing the chunk content, metadata, and BM25 score.
        """
        if not self.bm25:
            return []

        tokenized_query = self._tokenize(query)
        doc_scores = self.bm25.get_scores(tokenized_query)

        # Pair scores with their corresponding metadata and chunk content
        scored_results = [
            {
                "content": self.corpus_chunks[i], 
                "metadata": self.corpus_metadata[i], 
                "score": float(score)
            }
            for i, score in enumerate(doc_scores)
        ]

        # Enforce multi-tenancy logical isolation via post-filtering
        filtered_results = [
            res for res in scored_results 
            if res["metadata"].get("tenant_id") == tenant_id
        ]

        # Sort descending by score
        sorted_results = sorted(filtered_results, key=lambda x: x["score"], reverse=True)
        
        return sorted_results[:top_k]
