using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Represents visual grounding citation metadata anchoring an assertion to a physical document chunk and page.
/// </summary>
public class CitationMetadataDto
{
    /// <summary>
    /// Gets or sets the referenced document identifier.
    /// </summary>
    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the 1-indexed document page number.
    /// </summary>
    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    /// <summary>
    /// Gets or sets the exact text snippet grounding the generated answer.
    /// </summary>
    [JsonPropertyName("snippet")]
    public string Snippet { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the relevance or retrieval confidence score.
    /// </summary>
    [JsonPropertyName("score")]
    public double Score { get; set; } = 0.90;
}
