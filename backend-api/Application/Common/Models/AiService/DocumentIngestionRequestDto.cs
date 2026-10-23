using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object representing a document ingestion payload dispatched to the AI microservice.
/// </summary>
public class DocumentIngestionRequestDto
{
    /// <summary>
    /// Gets or sets the multi-tenant isolation boundary identifier.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique document identifier.
    /// </summary>
    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the raw document text content to be chunked and indexed.
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets additional metadata attributes associated with the document.
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}
