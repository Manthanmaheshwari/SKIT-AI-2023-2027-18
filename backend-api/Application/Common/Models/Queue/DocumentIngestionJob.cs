using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.Queue;

/// <summary>
/// Represents an asynchronous document ingestion job dispatched to the RabbitMQ-style background queue.
/// </summary>
public class DocumentIngestionJob
{
    /// <summary>
    /// Gets or sets the unique job tracking identifier.
    /// </summary>
    [JsonPropertyName("job_id")]
    public string JobId { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>
    /// Gets or sets the multi-tenant isolation boundary identifier.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the document source URI (e.g. file://, data:, s3://, or local path).
    /// </summary>
    [JsonPropertyName("document_uri")]
    public string DocumentUri { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the current execution status (Queued, Parsing, Chunking, Indexed, Failed, DeadLetter).
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "Queued";

    /// <summary>
    /// Gets or sets the count of retry attempts executed so far.
    /// </summary>
    [JsonPropertyName("retry_count")]
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Gets or sets the maximum allowed retry attempts before dead-lettering.
    /// </summary>
    [JsonPropertyName("max_retries")]
    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Gets or sets the diagnostic error message if execution encountered a failure.
    /// </summary>
    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets the count of semantic vector chunks generated and indexed.
    /// </summary>
    [JsonPropertyName("chunks_indexed")]
    public int ChunksIndexed { get; set; } = 0;

    /// <summary>
    /// Gets or sets the total processing duration in milliseconds.
    /// </summary>
    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; } = 0;

    /// <summary>
    /// Gets or sets arbitrary document metadata.
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// Gets or sets the UTC timestamp when the job was placed in the queue.
    /// </summary>
    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the UTC timestamp of the last status update.
    /// </summary>
    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
