"""
Service module for executing Reciprocal Rank Fusion (RRF).

This module combines the results of distinct search algorithms (dense vectors
and sparse keyword algorithms) into a single unified and re-ranked result set.
"""

from typing import List, Dict, Any

class ReciprocalRankFusionService:
    """
    Service that applies the Reciprocal Rank Fusion (RRF) algorithm.
    """

    def __init__(self, k: int = 60):
        """
        Initialize the RRF service.

        Args:
            k: A constant used in the RRF formula to mitigate the impact of outliers.
               The value 60 is a standard default established in Information Retrieval research.
        """
        self.k = k

    def fuse_results(
        self, 
        dense_results: List[Dict[str, Any]], 
        sparse_results: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Merge and rank two lists of search results utilizing the RRF formula.

        Mathematical Normalization Process:
        The RRF algorithm does not rely on the absolute scores provided by the individual
        retrieval systems, which often operate on entirely different mathematical scales
        (e.g., Cosine Similarity vs. TF-IDF/BM25). Instead, RRF utilizes the ordinal rank 
        of the documents within their respective result sets.

        The formula applied for a given document 'd' across a set of rankings 'R' is:
        RRF_Score(d) = Sum( 1 / (k + rank(d, r)) ) for r in R

        Where 'rank(d, r)' is the 1-based position of document 'd' in the ranking 'r',
        and 'k' is a constant smoothing factor.

        Args:
            dense_results: Ordered list of results from the dense vector store.
                           Expected format: [{"metadata": {"chunk_id": ...}, "content": ...}, ...]
            sparse_results: Ordered list of results from the sparse keyword index.
            top_k: The final number of fused results to return.

        Returns:
            A consolidated list of the most relevant results ranked by their computed RRF score.
        """
        rrf_scores: Dict[str, float] = {}
        document_map: Dict[str, Dict[str, Any]] = {}

        def process_ranking(ranking: List[Dict[str, Any]]):
            """
            Process an individual ranked list and update the global RRF scores.
            """
            for rank, item in enumerate(ranking):
                # Utilizing a unique identifier to merge results across systems.
                # Assuming 'chunk_id' is present; falling back to content hash if not.
                doc_id = item.get("metadata", {}).get("chunk_id")
                if not doc_id:
                    doc_id = str(hash(item.get("content", "")))
                
                if doc_id not in rrf_scores:
                    rrf_scores[doc_id] = 0.0
                    document_map[doc_id] = item
                
                # Apply the RRF mathematical formulation (1-based index)
                rrf_scores[doc_id] += 1.0 / (self.k + (rank + 1))

        # Process both retrieval pipelines
        process_ranking(dense_results)
        process_ranking(sparse_results)

        # Sort the aggregated results by their new RRF score in descending order
        sorted_fused_docs = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # Reconstruct the final result list
        final_results = []
        for doc_id, score in sorted_fused_docs[:top_k]:
            merged_item = document_map[doc_id].copy()
            merged_item["rrf_score"] = score
            final_results.append(merged_item)

        return final_results
