using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.Queue;

/// <summary>
/// Request payload to enqueue a document ingestion job into the background queue.
/// </summary>
public class EnqueueDocumentJobRequestDto
{
    /// <summary>
    /// Optional custom job GUID. If null, a new GUID will be generated automatically.
    /// </summary>
    [JsonPropertyName("job_id")]
    public string? JobId { get; set; }

    /// <summary>
    /// Multi-tenant boundary identifier. If null, active tenant from JWT/header will be resolved.
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string? TenantId { get; set; }

    /// <summary>
    /// The physical or logical URI of the document (file path, data URI, s3://, etc.).
    /// </summary>
    [JsonPropertyName("document_uri")]
    public string DocumentUri { get; set; } = string.Empty;

    /// <summary>
    /// Optional document metadata (title, category, classification, author, etc.).
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// Response returned immediately upon successfully placing a job in the queue.
/// </summary>
public class EnqueueDocumentJobResponseDto
{
    [JsonPropertyName("job_id")]
    public string JobId { get; set; } = string.Empty;

    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    [JsonPropertyName("document_uri")]
    public string DocumentUri { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "Queued";

    [JsonPropertyName("enqueued_at")]
    public DateTime EnqueuedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Telemetry and execution metrics for a tracked background queue job.
/// </summary>
public class DocumentJobStatusDto
{
    [JsonPropertyName("job_id")]
    public string JobId { get; set; } = string.Empty;

    [JsonPropertyName("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    [JsonPropertyName("document_uri")]
    public string DocumentUri { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("retry_count")]
    public int RetryCount { get; set; }

    [JsonPropertyName("max_retries")]
    public int MaxRetries { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("chunks_indexed")]
    public int ChunksIndexed { get; set; }

    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAtUtc { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAtUtc { get; set; }

    [JsonPropertyName("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Aggregated queue engine health and throughput metrics.
/// </summary>
public class QueueMetricsDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "operational";

    [JsonPropertyName("active_workers")]
    public int ActiveWorkers { get; set; }

    [JsonPropertyName("queue_depth")]
    public int QueueDepth { get; set; }

    [JsonPropertyName("total_jobs")]
    public int TotalJobs { get; set; }

    [JsonPropertyName("by_status")]
    public Dictionary<string, int> ByStatus { get; set; } = new();

    [JsonPropertyName("dead_letter_count")]
    public int DeadLetterCount { get; set; }

    [JsonPropertyName("broker_type")]
    public string BrokerType { get; set; } = "AsyncChannelInMemory";

    [JsonPropertyName("broker_connected")]
    public bool BrokerConnected { get; set; }
}
