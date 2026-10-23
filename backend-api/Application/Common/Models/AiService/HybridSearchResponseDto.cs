using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object returned by the Python AI microservice for hybrid search operations.
/// </summary>
public class HybridSearchResponseDto
{
    /// <summary>
    /// Gets or sets the processed query string.
    /// </summary>
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the tenant identifier that bounded the retrieval.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the list of candidates ranked and unified by Reciprocal Rank Fusion.
    /// </summary>
    [JsonPropertyName("results")]
    public List<FusedDocumentDto> Results { get; set; } = new();
}
