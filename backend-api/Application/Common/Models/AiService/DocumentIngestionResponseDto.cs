using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object returned by the Python AI microservice following document ingestion.
/// </summary>
public class DocumentIngestionResponseDto
{
    /// <summary>
    /// Gets or sets the confirmation message returned by the microservice.
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the ingested document identifier.
    /// </summary>
    [JsonPropertyName("document_id")]
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the isolated tenant scope.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the number of semantic text chunks generated and indexed.
    /// </summary>
    [JsonPropertyName("chunks_indexed")]
    public int ChunksIndexed { get; set; }

    /// <summary>
    /// Gets or sets the aggregate vector count currently stored for this tenant.
    /// </summary>
    [JsonPropertyName("total_tenant_vector_count")]
    public int TotalTenantVectorCount { get; set; }
}
