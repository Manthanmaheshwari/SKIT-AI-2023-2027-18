using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object for dispatching a hybrid search request to the AI microservice.
/// </summary>
public class HybridSearchRequestDto
{
    /// <summary>
    /// Gets or sets the tenant identifier for multi-tenant candidate isolation.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the query string for semantic and lexical evaluation.
    /// </summary>
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the maximum count of fused candidates to return.
    /// </summary>
    [JsonPropertyName("top_k")]
    public int TopK { get; set; } = 5;
}
