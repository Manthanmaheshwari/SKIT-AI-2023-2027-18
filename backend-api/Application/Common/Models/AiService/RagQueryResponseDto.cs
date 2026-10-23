using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object returned by the Python AI microservice for end-to-end RAG synthesis.
/// </summary>
public class RagQueryResponseDto
{
    /// <summary>
    /// Gets or sets the original user query.
    /// </summary>
    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the tenant boundary identifier.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the grounded answer generated via LLM inference.
    /// </summary>
    [JsonPropertyName("synthesized_response")]
    public string SynthesizedResponse { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the list of visual grounding citations.
    /// </summary>
    [JsonPropertyName("citations")]
    public List<CitationMetadataDto> Citations { get; set; } = new();

    /// <summary>
    /// Gets or sets the top fused candidate chunks retrieved from the knowledge store.
    /// </summary>
    [JsonPropertyName("retrieved_documents")]
    public List<FusedDocumentDto> RetrievedDocuments { get; set; } = new();

    /// <summary>
    /// Gets or sets the model identifier used for inference (e.g. llama-3.3-70b-versatile).
    /// </summary>
    [JsonPropertyName("model_used")]
    public string ModelUsed { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the end-to-end pipeline latency in milliseconds.
    /// </summary>
    [JsonPropertyName("latency_ms")]
    public double LatencyMs { get; set; }

    /// <summary>
    /// Gets or sets the inference engine provider.
    /// </summary>
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;
}
