"""
Service package initialization.
"""

from services.rrf_service import (
    FusedDocument,
    RRFConfig,
    RankedDocument,
    ReciprocalRankFusionService,
    fuse_rankings,
    reciprocal_rank_fusion,
)

__all__ = [
    "ReciprocalRankFusionService",
    "reciprocal_rank_fusion",
    "fuse_rankings",
    "RankedDocument",
    "FusedDocument",
    "RRFConfig",
]
