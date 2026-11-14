using EnterpriseApi.Application.Common.Models.Queue;

namespace EnterpriseApi.Application.Common.Interfaces;

/// <summary>
/// Defines asynchronous RabbitMQ-style queue publishing and job tracking contract for document ingestion jobs.
/// </summary>
public interface IAsyncDocumentQueuePublisher
{
    /// <summary>
    /// Publishes a prepared document ingestion job into the asynchronous processing queue.
    /// </summary>
    /// <param name="job">The document ingestion job payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The assigned JobId.</returns>
    ValueTask<string> PublishJobAsync(DocumentIngestionJob job, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates and immediately enqueues a document ingestion job with job_id, tenant_id, and document_uri.
    /// Does not block the main HTTP web thread.
    /// </summary>
    /// <param name="tenantId">The multi-tenant boundary identifier.</param>
    /// <param name="documentUri">The document URI or file path.</param>
    /// <param name="jobId">Optional custom job identifier.</param>
    /// <param name="metadata">Optional document metadata dictionary.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The enqueued document ingestion job instance in Queued state.</returns>
    ValueTask<DocumentIngestionJob> EnqueueAsync(
        string tenantId,
        string documentUri,
        string? jobId = null,
        Dictionary<string, object>? metadata = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads the next available document ingestion job from the queue (consumed by the background worker service).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The next job to be processed.</returns>
    ValueTask<DocumentIngestionJob> ReadJobAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the current execution status and tracking telemetry for a given job.
    /// </summary>
    /// <param name="jobId">The unique job identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The job state if found; otherwise null.</returns>
    Task<DocumentIngestionJob?> GetJobStatusAsync(string jobId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the job status through its lifecycle transitions (Queued -> Parsing -> Chunking -> Indexed).
    /// </summary>
    /// <param name="jobId">The unique job identifier.</param>
    /// <param name="status">The new status value.</param>
    /// <param name="errorMessage">Optional error message if failed.</param>
    /// <param name="chunksIndexed">Count of chunks indexed if completed.</param>
    /// <param name="processingTimeMs">Processing duration in milliseconds.</param>
    /// <param name="metadataUpdates">Optional metadata delta.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task UpdateJobStatusAsync(
        string jobId,
        string status,
        string? errorMessage = null,
        int? chunksIndexed = null,
        double? processingTimeMs = null,
        Dictionary<string, object>? metadataUpdates = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Routes a failed job that exceeded max retry attempts to the Dead-Letter Queue (DLQ).
    /// </summary>
    /// <param name="job">The failed job instance.</param>
    /// <param name="reason">The failure reason and stack trace snippet.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task MoveToDeadLetterAsync(DocumentIngestionJob job, string reason, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all dead-lettered jobs currently in the DLQ for administrative monitoring.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Collection of dead-lettered document jobs.</returns>
    Task<IReadOnlyList<DocumentIngestionJob>> GetDeadLetterJobsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves aggregated telemetry, active queue depth, and status distribution metrics.
    /// </summary>
    /// <returns>Queue telemetry metrics.</returns>
    QueueMetricsDto GetMetrics();
}
