using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object for executing an end-to-end RAG inquiry against the Python AI microservice.
/// </summary>
public class RagQueryRequestDto
{
    /// <summary>
    /// Gets or sets the tenant isolation boundary identifier.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user query to ground and synthesize.
    /// </summary>
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate retrieval ceiling (default: 5).
    /// </summary>
    [JsonPropertyName("top_k")]
    public int TopK { get; set; } = 5;

    /// <summary>
    /// Gets or sets an optional sampling temperature override for the LLM inference engine.
    /// </summary>
    [JsonPropertyName("temperature")]
    public double? Temperature { get; set; }

    /// <summary>
    /// Gets or sets an optional maximum token budget for the synthesized answer.
    /// </summary>
    [JsonPropertyName("max_tokens")]
    public int? MaxTokens { get; set; }
}
