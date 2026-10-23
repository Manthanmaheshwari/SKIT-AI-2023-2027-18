using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Represents a ranked and fused document candidate produced by Reciprocal Rank Fusion (RRF).
/// </summary>
public class FusedDocumentDto
{
    /// <summary>
    /// Gets or sets the unique chunk identifier.
    /// </summary>
    [JsonPropertyName("chunk_id")]
    public string ChunkId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the parent document identifier.
    /// </summary>
    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the textual snippet extracted from the document.
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the 1-indexed document page number.
    /// </summary>
    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    /// <summary>
    /// Gets or sets the computed Reciprocal Rank Fusion composite score.
    /// </summary>
    [JsonPropertyName("rrf_score")]
    public double RrfScore { get; set; }

    /// <summary>
    /// Gets or sets the original ranking position from dense vector retrieval.
    /// </summary>
    [JsonPropertyName("dense_rank")]
    public int? DenseRank { get; set; }

    /// <summary>
    /// Gets or sets the original ranking position from sparse BM25 retrieval.
    /// </summary>
    [JsonPropertyName("sparse_rank")]
    public int? SparseRank { get; set; }

    /// <summary>
    /// Gets or sets arbitrary metadata attached to the indexed chunk.
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}
