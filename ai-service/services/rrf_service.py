"""
Service module for executing Reciprocal Rank Fusion (RRF).

This module combines the results of distinct search algorithms (dense vectors
from ChromaDB and sparse keyword search from BM25) into a single unified and
re-ranked result set using reciprocal rank scoring.

Mathematical Foundation:
------------------------
Traditional score-based fusion methods require min-max or z-score calibration,
which is fragile across heterogeneous retrieval mechanisms because vector similarity
(e.g., Cosine/L2 distance in [-1, 1] or [0, 2]) and lexical scores (e.g., BM25 Okapi
in [0, infinity)) operate on vastly different statistical distributions.

Reciprocal Rank Fusion (RRF) bypasses score calibration by operating strictly on
ordinal rank positions. Formally, for a document candidate 'd' across a set of
retrieval rankings 'M' (e.g., M = {dense, sparse}):

    RRF_Score(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)}

where:
    - r_m(d) is the 1-based ordinal rank of document d in retrieval system m.
    - k is a hyperparameter smoothing constant (default: 60) that prevents
      overly dominant weightings from top-ranked documents and stabilizes
      fusion across high-variance candidate pools.

Reference:
    Cormack, G. V., Clarke, C. L., & Büttcher, S. (2009).
    "Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods."
    Proceedings of the 32nd international ACM SIGIR conference on Research and
    development in information retrieval (SIGIR '09), pp. 758-759.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Dict, List, Optional, Sequence, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

logger = logging.getLogger(__name__)


class RankedDocument(BaseModel):
    """
    Strict Pydantic schema representing an individual document candidate
    retrieved from an upstream search pipeline (ChromaDB or BM25).
    """

    model_config = ConfigDict(
        extra="allow",
        populate_by_name=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
    )

    id: Optional[str] = Field(
        default=None,
        description="Unique identifier for the document or chunk. Auto-inferred if omitted.",
    )
    document_id: Optional[str] = Field(
        default=None,
        description="Identifier of the parent document.",
    )
    chunk_id: Optional[str] = Field(
        default=None,
        description="Unique identifier of the specific chunk.",
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Text content of the retrieved chunk.",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary document metadata dictionary (tenant_id, document_id, page, etc.).",
    )
    score: Optional[float] = Field(
        default=None,
        description="Raw similarity or relevance score from the retrieval engine.",
    )
    rank: Optional[int] = Field(
        default=None,
        ge=1,
        description="1-based original rank within the source retrieval system result set.",
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize_document_payload(cls, data: Any) -> Any:
        """
        Normalize heterogeneous dictionary representations from various search engines
        (e.g., ChromaDB, LangChain, BM25) into standard RankedDocument fields.
        """
        if not isinstance(data, dict):
            return data

        payload = dict(data)

        # Normalize textual content across alternative key conventions
        if "content" not in payload or not payload["content"]:
            for alt_key in ("page_content", "text", "body", "document"):
                if alt_key in payload and payload[alt_key]:
                    payload["content"] = str(payload[alt_key])
                    break
            else:
                doc_ident = payload.get("document_id") or payload.get("id") or "candidate"
                payload["content"] = f"Document content representation for {doc_ident}"

        # Ensure metadata is an isolated dictionary
        raw_meta = payload.get("metadata")
        metadata = dict(raw_meta) if isinstance(raw_meta, dict) else {}
        payload["metadata"] = metadata

        # Extract or harmonize document_id
        doc_id = payload.get("document_id") or metadata.get("document_id")
        if doc_id is not None:
            doc_id_str = str(doc_id)
            payload["document_id"] = doc_id_str
            if "document_id" not in metadata:
                metadata["document_id"] = doc_id_str

        # Extract or harmonize chunk_id
        chunk_id = payload.get("chunk_id") or metadata.get("chunk_id")
        if chunk_id is not None:
            chunk_id_str = str(chunk_id)
            payload["chunk_id"] = chunk_id_str
            if "chunk_id" not in metadata:
                metadata["chunk_id"] = chunk_id_str

        # Resolve primary candidate identifier
        resolved_id = (
            payload.get("id")
            or chunk_id
            or metadata.get("id")
            or doc_id
        )

        # If no explicit ID exists, generate a deterministic SHA-256 digest of chunk content
        if not resolved_id:
            content_str = str(payload.get("content", "")).strip()
            resolved_id = hashlib.sha256(content_str.encode("utf-8")).hexdigest()[:16]

        payload["id"] = str(resolved_id)
        return payload


class FusedDocument(BaseModel):
    """
    Strict Pydantic schema representing a unified and re-ranked document candidate
    resulting from Reciprocal Rank Fusion, with score provenance and metadata.
    """

    model_config = ConfigDict(
        extra="allow",
        populate_by_name=True,
        validate_assignment=True,
    )

    id: str = Field(
        ...,
        description="Unique identifier for the fused chunk candidate.",
    )
    document_id: Optional[str] = Field(
        default=None,
        description="Parent document identifier.",
    )
    chunk_id: Optional[str] = Field(
        default=None,
        description="Unique chunk identifier.",
    )
    content: str = Field(
        ...,
        description="Text content of the retrieved chunk.",
    )
    score: float = Field(
        ...,
        ge=0.0,
        description="Consolidated Reciprocal Rank Fusion (RRF) score: Sum(1 / (k + rank)).",
    )
    rrf_score: float = Field(
        ...,
        ge=0.0,
        description="Explicit RRF score identical to 'score' for full API compatibility.",
    )
    dense_rank: Optional[int] = Field(
        default=None,
        ge=1,
        description="1-based ordinal rank within ChromaDB dense retrieval, if present.",
    )
    sparse_rank: Optional[int] = Field(
        default=None,
        ge=1,
        description="1-based ordinal rank within BM25 sparse retrieval, if present.",
    )
    dense_score: Optional[float] = Field(
        default=None,
        description="Original raw similarity score from ChromaDB dense search, if present.",
    )
    sparse_score: Optional[float] = Field(
        default=None,
        description="Original raw score from BM25 sparse search, if present.",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Consolidated metadata dictionary preserving tenant and document attributes.",
    )

    def __getitem__(self, key: str) -> Any:
        """Provide dictionary subscription access for backward compatibility."""
        if hasattr(self, key):
            return getattr(self, key)
        if key in self.metadata:
            return self.metadata[key]
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        """Provide dictionary .get() access for backward compatibility."""
        if hasattr(self, key):
            return getattr(self, key)
        return self.metadata.get(key, default)

    def __contains__(self, key: str) -> bool:
        """Provide dictionary membership testing for backward compatibility."""
        return hasattr(self, key) or key in self.metadata


class RRFConfig(BaseModel):
    """
    Configuration model for Reciprocal Rank Fusion parameters.
    """

    k: int = Field(
        default=60,
        gt=0,
        description="RRF smoothing constant (default: 60). Mitigates outlier bias in top rankings.",
    )
    top_k: Optional[int] = Field(
        default=None,
        gt=0,
        description="Maximum number of fused candidates to return. If None, returns all candidates.",
    )


def reciprocal_rank_fusion(
    dense_results: Sequence[Union[Dict[str, Any], RankedDocument]],
    sparse_results: Sequence[Union[Dict[str, Any], RankedDocument]],
    k: int = 60,
    top_k: Optional[int] = None,
) -> List[FusedDocument]:
    """
    Execute Reciprocal Rank Fusion (RRF) to merge and normalize two ranked lists of document dictionaries.

    Combines candidate documents from ChromaDB dense vector search and BM25 sparse keyword
    search into a single consolidated, re-ranked list based on their ordinal positions.

    Mathematical Formulation:
        RRF_Score(d) = \\sum_{m \\in \\{dense, sparse\\}} \\frac{1}{k + rank_m(d)}

    Args:
        dense_results: Ranked list of document dictionaries or RankedDocument models from
                       ChromaDB dense search. Higher rank corresponds to lower 1-based index.
        sparse_results: Ranked list of document dictionaries or RankedDocument models from
                        BM25 sparse search. Higher rank corresponds to lower 1-based index.
        k: Smoothing constant hyperparameter (default: 60). Must be a positive integer.
        top_k: Optional integer specifying the maximum number of fused candidates to return.
               If None, all unique candidates are returned.

    Returns:
        A list of FusedDocument models sorted in descending order of their computed RRF scores.

    Raises:
        ValueError: If k <= 0 or if top_k is provided and <= 0.
    """
    if k <= 0:
        raise ValueError(f"RRF smoothing parameter 'k' must be a positive integer, got: {k}")

    if top_k is not None and top_k <= 0:
        raise ValueError(f"Parameter 'top_k' must be a positive integer, got: {top_k}")

    # Fast path: both retrieval sets are empty
    if not dense_results and not sparse_results:
        return []

    rrf_scores: Dict[str, float] = {}
    dense_ranks: Dict[str, int] = {}
    sparse_ranks: Dict[str, int] = {}
    dense_raw_scores: Dict[str, Optional[float]] = {}
    sparse_raw_scores: Dict[str, Optional[float]] = {}
    canonical_documents: Dict[str, RankedDocument] = {}

    def _process_ranking(
        ranking: Sequence[Union[Dict[str, Any], RankedDocument]],
        is_dense: bool,
    ) -> None:
        """
        Process a single ranked list, validate candidates via Pydantic,
        and accumulate RRF scores.
        """
        seen_in_this_retriever: set[str] = set()

        for rank_idx, raw_item in enumerate(ranking, start=1):
            if isinstance(raw_item, RankedDocument):
                doc = raw_item
            else:
                doc = RankedDocument.model_validate(raw_item)

            doc_id = doc.id
            if not doc_id:
                continue

            # Prevent duplicate occurrences within the same retriever from inflating score;
            # IR best practice retains only the candidate's highest rank (first occurrence).
            if doc_id in seen_in_this_retriever:
                continue
            seen_in_this_retriever.add(doc_id)

            # Apply standard RRF reciprocal rank formulation: 1 / (k + rank)
            score_contribution = 1.0 / (k + rank_idx)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + score_contribution

            if is_dense:
                dense_ranks[doc_id] = rank_idx
                dense_raw_scores[doc_id] = doc.score
            else:
                sparse_ranks[doc_id] = rank_idx
                sparse_raw_scores[doc_id] = doc.score

            if doc_id not in canonical_documents:
                canonical_documents[doc_id] = doc
            else:
                # Merge metadata across retrievers, preserving earlier values while supplementing new ones
                existing_doc = canonical_documents[doc_id]
                merged_meta = dict(existing_doc.metadata)
                merged_meta.update(doc.metadata)
                existing_doc.metadata = merged_meta

                if not existing_doc.document_id and doc.document_id:
                    existing_doc.document_id = doc.document_id
                if not existing_doc.chunk_id and doc.chunk_id:
                    existing_doc.chunk_id = doc.chunk_id

    # Ingest dense and sparse rankings
    _process_ranking(dense_results, is_dense=True)
    _process_ranking(sparse_results, is_dense=False)

    # Construct the fused document representations
    fused_candidates: List[FusedDocument] = []
    for doc_id, doc in canonical_documents.items():
        computed_score = rrf_scores[doc_id]

        fused_doc = FusedDocument(
            id=doc_id,
            document_id=doc.document_id,
            chunk_id=doc.chunk_id,
            content=doc.content,
            score=computed_score,
            rrf_score=computed_score,
            dense_rank=dense_ranks.get(doc_id),
            sparse_rank=sparse_ranks.get(doc_id),
            dense_score=dense_raw_scores.get(doc_id),
            sparse_score=sparse_raw_scores.get(doc_id),
            metadata=doc.metadata,
        )
        fused_candidates.append(fused_doc)

    # Sort descending by RRF score.
    # Deterministic secondary tie-breaker: best rank across retrievers, then lexical doc_id.
    fused_candidates.sort(
        key=lambda d: (
            -d.score,
            min(d.dense_rank or 999_999, d.sparse_rank or 999_999),
            d.id,
        )
    )

    if top_k is not None:
        fused_candidates = fused_candidates[:top_k]

    return fused_candidates


# Functional alias
fuse_rankings = reciprocal_rank_fusion


class ReciprocalRankFusionService:
    """
    Enterprise service wrapper for Reciprocal Rank Fusion (RRF).

    Provides an object-oriented interface configured with a default smoothing factor
    'k' (default: 60) for seamless integration into multi-tenant RAG retrieval pipelines.
    """

    def __init__(self, k: int = 60) -> None:
        """
        Initialize the Reciprocal Rank Fusion Service.

        Args:
            k: Smoothing constant to adjust ranking bias (default: 60).
        """
        if k <= 0:
            raise ValueError(f"RRF smoothing parameter 'k' must be a positive integer, got: {k}")
        self.k = k

    def fuse_results(
        self,
        dense_results: Sequence[Union[Dict[str, Any], RankedDocument]],
        sparse_results: Sequence[Union[Dict[str, Any], RankedDocument]],
        top_k: Optional[int] = 5,
    ) -> List[FusedDocument]:
        """
        Merge and re-rank candidate documents from dense vector search (ChromaDB)
        and sparse keyword search (BM25) using Reciprocal Rank Fusion.

        Args:
            dense_results: Ordered candidates from dense vector search.
            sparse_results: Ordered candidates from sparse keyword search.
            top_k: Optional limit on the number of returned results (default: 5).

        Returns:
            A list of FusedDocument models sorted by descending RRF score.
        """
        return reciprocal_rank_fusion(
            dense_results=dense_results,
            sparse_results=sparse_results,
            k=self.k,
            top_k=top_k,
        )
