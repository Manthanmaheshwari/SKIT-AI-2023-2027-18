using System.Collections.Concurrent;
using System.Threading.Channels;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models.Queue;
using EnterpriseApi.Application.Common.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Infrastructure.Services;

/// <summary>
/// High-performance asynchronous RabbitMQ-style queue publisher for document ingestion jobs.
/// Dispatches jobs without blocking the main web thread using bounded asynchronous channels,
/// and maintains thread-safe real-time status tracking and dead-letter handling.
/// </summary>
public class AsyncDocumentQueuePublisher : IAsyncDocumentQueuePublisher
{
    private readonly Channel<DocumentIngestionJob> _channel;
    private readonly ConcurrentDictionary<string, DocumentIngestionJob> _jobs = new();
    private readonly ConcurrentQueue<DocumentIngestionJob> _deadLetterQueue = new();
    private readonly DocumentQueueOptions _options;
    private readonly ILogger<AsyncDocumentQueuePublisher> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AsyncDocumentQueuePublisher"/> class.
    /// </summary>
    /// <param name="options">Queue configuration options.</param>
    /// <param name="logger">Logger instance.</param>
    public AsyncDocumentQueuePublisher(
        IOptions<DocumentQueueOptions> options,
        ILogger<AsyncDocumentQueuePublisher> logger)
    {
        _options = options.Value;
        _logger = logger;

        var channelOptions = new BoundedChannelOptions(Math.Max(100, _options.ChannelCapacity))
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        };

        _channel = Channel.CreateBounded<DocumentIngestionJob>(channelOptions);

        _logger.LogInformation(
            "AsyncDocumentQueuePublisher initialized with bounded capacity {Capacity} (MaxWorkers: {Workers}, MaxRetries: {Retries}).",
            _options.ChannelCapacity, _options.MaxConcurrentWorkers, _options.MaxRetryAttempts);
    }

    /// <inheritdoc />
    public async ValueTask<string> PublishJobAsync(DocumentIngestionJob job, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(job);

        job.Status = "Queued";
        job.CreatedAtUtc = DateTime.UtcNow;
        job.UpdatedAtUtc = DateTime.UtcNow;

        _jobs[job.JobId] = job;

        await _channel.Writer.WriteAsync(job, cancellationToken);

        _logger.LogInformation(
            "Published document ingestion job '{JobId}' for tenant '{TenantId}' to queue (URI: '{Uri}').",
            job.JobId, job.TenantId, job.DocumentUri);

        return job.JobId;
    }

    /// <inheritdoc />
    public async ValueTask<DocumentIngestionJob> EnqueueAsync(
        string tenantId,
        string documentUri,
        string? jobId = null,
        Dictionary<string, object>? metadata = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            throw new ArgumentException("Tenant identifier cannot be empty.", nameof(tenantId));
        }

        if (string.IsNullOrWhiteSpace(documentUri))
        {
            throw new ArgumentException("Document URI cannot be empty.", nameof(documentUri));
        }

        var effectiveJobId = !string.IsNullOrWhiteSpace(jobId) ? jobId : Guid.NewGuid().ToString("N");

        var job = new DocumentIngestionJob
        {
            JobId = effectiveJobId,
            TenantId = tenantId,
            DocumentUri = documentUri,
            Status = "Queued",
            RetryCount = 0,
            MaxRetries = _options.MaxRetryAttempts,
            Metadata = metadata != null ? new Dictionary<string, object>(metadata) : new(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _jobs[effectiveJobId] = job;

        await _channel.Writer.WriteAsync(job, cancellationToken);

        _logger.LogInformation(
            "Enqueued background document ingestion job '{JobId}' (Tenant: '{TenantId}', URI: '{Uri}').",
            effectiveJobId, tenantId, documentUri);

        return job;
    }

    /// <inheritdoc />
    public ValueTask<DocumentIngestionJob> ReadJobAsync(CancellationToken cancellationToken = default)
    {
        return _channel.Reader.ReadAsync(cancellationToken);
    }

    /// <inheritdoc />
    public Task<DocumentIngestionJob?> GetJobStatusAsync(string jobId, CancellationToken cancellationToken = default)
    {
        _jobs.TryGetValue(jobId, out var job);
        return Task.FromResult(job);
    }

    /// <inheritdoc />
    public Task UpdateJobStatusAsync(
        string jobId,
        string status,
        string? errorMessage = null,
        int? chunksIndexed = null,
        double? processingTimeMs = null,
        Dictionary<string, object>? metadataUpdates = null,
        CancellationToken cancellationToken = default)
    {
        if (_jobs.TryGetValue(jobId, out var job))
        {
            job.Status = status;
            job.UpdatedAtUtc = DateTime.UtcNow;

            if (errorMessage != null)
            {
                job.ErrorMessage = errorMessage;
            }

            if (chunksIndexed.HasValue)
            {
                job.ChunksIndexed = chunksIndexed.Value;
            }

            if (processingTimeMs.HasValue)
            {
                job.ProcessingTimeMs = processingTimeMs.Value;
            }

            if (metadataUpdates != null)
            {
                foreach (var kvp in metadataUpdates)
                {
                    job.Metadata[kvp.Key] = kvp.Value;
                }
            }
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task MoveToDeadLetterAsync(DocumentIngestionJob job, string reason, CancellationToken cancellationToken = default)
    {
        job.Status = "DeadLetter";
        job.ErrorMessage = reason;
        job.UpdatedAtUtc = DateTime.UtcNow;

        _jobs[job.JobId] = job;
        _deadLetterQueue.Enqueue(job);

        _logger.LogError(
            "CRITICAL: Document ingestion job '{JobId}' (Tenant: '{TenantId}') routed to Dead-Letter Queue (DLQ). Reason: {Reason}",
            job.JobId, job.TenantId, reason);

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<DocumentIngestionJob>> GetDeadLetterJobsAsync(CancellationToken cancellationToken = default)
    {
        var list = _deadLetterQueue.ToArray();
        return Task.FromResult<IReadOnlyList<DocumentIngestionJob>>(list);
    }

    /// <inheritdoc />
    public QueueMetricsDto GetMetrics()
    {
        var allJobs = _jobs.Values.ToList();
        var counts = new Dictionary<string, int>
        {
            ["Queued"] = 0,
            ["Parsing"] = 0,
            ["Chunking"] = 0,
            ["Indexed"] = 0,
            ["Failed"] = 0,
            ["DeadLetter"] = 0
        };

        foreach (var j in allJobs)
        {
            if (counts.ContainsKey(j.Status))
            {
                counts[j.Status]++;
            }
            else
            {
                counts[j.Status] = 1;
            }
        }

        return new QueueMetricsDto
        {
            Status = "operational",
            ActiveWorkers = _options.MaxConcurrentWorkers,
            QueueDepth = _channel.Reader.Count,
            TotalJobs = allJobs.Count,
            ByStatus = counts,
            DeadLetterCount = _deadLetterQueue.Count,
            BrokerType = _options.UseRabbitMqBroker ? "RabbitMQ" : "AsyncChannelInMemory",
            BrokerConnected = false // Set dynamically if live AMQP connected
        };
    }
}
