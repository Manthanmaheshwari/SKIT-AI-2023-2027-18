using System.Diagnostics;
using System.Text;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models.AiService;
using EnterpriseApi.Application.Common.Models.Queue;
using EnterpriseApi.Application.Common.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Infrastructure.Services;

/// <summary>
/// Background worker service that continuously consumes document ingestion jobs from the queue,
/// dispatches document parsing and vector chunking without blocking the main web thread,
/// and handles retry backoff and dead-letter routing.
/// </summary>
public class DocumentIngestionBackgroundWorker : BackgroundService
{
    private readonly IAsyncDocumentQueuePublisher _publisher;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly DocumentQueueOptions _options;
    private readonly ILogger<DocumentIngestionBackgroundWorker> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentIngestionBackgroundWorker"/> class.
    /// </summary>
    public DocumentIngestionBackgroundWorker(
        IAsyncDocumentQueuePublisher publisher,
        IServiceScopeFactory scopeFactory,
        IOptions<DocumentQueueOptions> options,
        ILogger<DocumentIngestionBackgroundWorker> logger)
    {
        _publisher = publisher;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "DocumentIngestionBackgroundWorker starting with {WorkerCount} concurrent worker tasks...",
            _options.MaxConcurrentWorkers);

        var workerTasks = new List<Task>();
        for (var i = 1; i <= Math.Max(1, _options.MaxConcurrentWorkers); i++)
        {
            var workerId = i;
            workerTasks.Add(Task.Run(() => ConsumerWorkerLoopAsync(workerId, stoppingToken), stoppingToken));
        }

        await Task.WhenAll(workerTasks);
        _logger.LogInformation("DocumentIngestionBackgroundWorker has shut down cleanly.");
    }

    private async Task ConsumerWorkerLoopAsync(int workerId, CancellationToken stoppingToken)
    {
        _logger.LogDebug("Consumer worker thread {WorkerId} active and awaiting jobs.", workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            DocumentIngestionJob? job = null;
            try
            {
                job = await _publisher.ReadJobAsync(stoppingToken);
                _logger.LogInformation(
                    "Worker {WorkerId} dequeued job '{JobId}' (Tenant: '{TenantId}', Attempt: {Attempt}/{MaxRetries}).",
                    workerId, job.JobId, job.TenantId, job.RetryCount + 1, job.MaxRetries);

                await ProcessJobWithResilienceAsync(job, workerId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected crash in consumer worker loop {WorkerId}.", workerId);
                await Task.Delay(500, stoppingToken);
            }
        }
    }

    private async Task ProcessJobWithResilienceAsync(DocumentIngestionJob job, int workerId, CancellationToken stoppingToken)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // 1. Status Transition: Queued -> Parsing
            await _publisher.UpdateJobStatusAsync(job.JobId, "Parsing", cancellationToken: stoppingToken);
            _logger.LogInformation("Job '{JobId}' status updated to Parsing.", job.JobId);

            // 2. Parse large document from document_uri without blocking web requests
            var (parsedContent, documentTitle) = await ParseDocumentContentAsync(job, stoppingToken);

            // 3. Status Transition: Parsing -> Chunking
            await _publisher.UpdateJobStatusAsync(job.JobId, "Chunking", cancellationToken: stoppingToken);
            _logger.LogInformation("Job '{JobId}' status updated to Chunking.", job.JobId);

            // 4. Dispatch chunking, vector embedding, and BM25 indexing via downstream AI microservice
            int chunksIndexed = 1;
            using (var scope = _scopeFactory.CreateScope())
            {
                var aiServiceClient = scope.ServiceProvider.GetRequiredService<IAiServiceClient>();

                var ingestionRequest = new DocumentIngestionRequestDto
                {
                    DocumentId = job.JobId,
                    TenantId = job.TenantId,
                    Content = parsedContent,
                    Metadata = new Dictionary<string, object>(job.Metadata)
                    {
                        ["title"] = documentTitle,
                        ["document_uri"] = job.DocumentUri,
                        ["queued_at_utc"] = job.CreatedAtUtc.ToString("O"),
                        ["processed_at_utc"] = DateTime.UtcNow.ToString("O")
                    }
                };

                var response = await aiServiceClient.IngestDocumentAsync(ingestionRequest, stoppingToken);
                chunksIndexed = Math.Max(1, response.ChunksIndexed);
            }

            // 5. Status Transition: Chunking -> Indexed (Success)
            stopwatch.Stop();
            var processingDurationMs = stopwatch.Elapsed.TotalMilliseconds;

            await _publisher.UpdateJobStatusAsync(
                job.JobId,
                status: "Indexed",
                errorMessage: null,
                chunksIndexed: chunksIndexed,
                processingTimeMs: processingDurationMs,
                cancellationToken: stoppingToken);

            _logger.LogInformation(
                "Worker {WorkerId} successfully indexed job '{JobId}' ({Chunks} chunks, {Duration:F1}ms).",
                workerId, job.JobId, chunksIndexed, processingDurationMs);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            var durationMs = stopwatch.Elapsed.TotalMilliseconds;
            var failureMessage = $"{ex.GetType().Name}: {ex.Message}";

            if (job.RetryCount < job.MaxRetries)
            {
                // Exponential retry backoff: delay = Base * 2^retry
                job.RetryCount++;
                var backoffDelay = Math.Min(
                    _options.MaxRetryDelayMilliseconds,
                    _options.BaseRetryDelayMilliseconds * (int)Math.Pow(2, job.RetryCount - 1));

                _logger.LogWarning(
                    ex,
                    "Job '{JobId}' failed on attempt {Attempt}/{MaxRetries}. Backing off for {Delay}ms before retry...",
                    job.JobId, job.RetryCount, job.MaxRetries, backoffDelay);

                await _publisher.UpdateJobStatusAsync(
                    job.JobId,
                    status: "Queued",
                    errorMessage: failureMessage,
                    processingTimeMs: durationMs,
                    cancellationToken: stoppingToken);

                await Task.Delay(backoffDelay, stoppingToken);
                await _publisher.PublishJobAsync(job, stoppingToken);
            }
            else
            {
                // Exceeded max retries -> route to Dead-Letter Queue (DLQ)
                _logger.LogError(
                    ex,
                    "CRITICAL: Job '{JobId}' exhausted all {MaxRetries} retries. Routing to Dead-Letter Queue.",
                    job.JobId, job.MaxRetries);

                await _publisher.MoveToDeadLetterAsync(job, failureMessage, stoppingToken);
            }
        }
    }

    private static async Task<(string Content, string Title)> ParseDocumentContentAsync(
        DocumentIngestionJob job,
        CancellationToken cancellationToken)
    {
        var uri = job.DocumentUri.Trim();
        var title = job.Metadata.TryGetValue("title", out var titleObj) ? titleObj?.ToString() ?? "Untitled Document" : "Untitled Document";

        // Check if content was embedded directly in job metadata
        if (job.Metadata.TryGetValue("content", out var contentObj) && contentObj != null && !string.IsNullOrWhiteSpace(contentObj.ToString()))
        {
            return (contentObj.ToString()!, title);
        }

        // Data URI handling: data:text/plain;base64,...
        if (uri.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var commaIndex = uri.IndexOf(',');
            if (commaIndex > 0)
            {
                var header = uri[..commaIndex];
                var data = uri[(commaIndex + 1)..];
                if (header.Contains("base64", StringComparison.OrdinalIgnoreCase))
                {
                    var bytes = Convert.FromBase64String(data);
                    var text = Encoding.UTF8.GetString(bytes);
                    return (text, title);
                }
                var decoded = Uri.UnescapeDataString(data);
                return (decoded, title);
            }
        }

        // Mock / Synthetic URI handling for tests & staging
        if (uri.StartsWith("mock://", StringComparison.OrdinalIgnoreCase) ||
            uri.StartsWith("inline://", StringComparison.OrdinalIgnoreCase))
        {
            var mockText = $"Synthetic document payload for job {job.JobId} (Tenant: {job.TenantId}). " +
                           $"Document URI: {uri}. Comprehensive background chunking and BM25 keyword verification.";
            return (mockText, title);
        }

        // Local file URI handling (file:///... or direct disk path)
        var filePath = uri;
        if (uri.StartsWith("file:///", StringComparison.OrdinalIgnoreCase))
        {
            filePath = uri[8..];
        }
        else if (uri.StartsWith("file://", StringComparison.OrdinalIgnoreCase))
        {
            filePath = uri[7..];
        }

        if (File.Exists(filePath))
        {
            var text = await File.ReadAllTextAsync(filePath, cancellationToken);
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new InvalidOperationException($"Document at '{filePath}' is empty.");
            }
            var fileName = Path.GetFileName(filePath);
            return (text, string.IsNullOrWhiteSpace(title) || title == "Untitled Document" ? fileName : title);
        }

        // HTTP / HTTPS handling placeholder
        if (uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            if (job.Metadata.TryGetValue("text", out var remoteTextObj) && remoteTextObj != null)
            {
                return (remoteTextObj.ToString()!, title);
            }
            throw new NotSupportedException($"Direct remote HTTP downloading for '{uri}' is not configured.");
        }

        throw new FileNotFoundException($"Document at URI '{uri}' could not be located or resolved.");
    }
}
