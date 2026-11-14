using System.Collections.Concurrent;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models.AiService;
using EnterpriseApi.Application.Common.Models.Queue;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;
using Xunit.Abstractions;

namespace EnterpriseApi.Tests;

public class DocumentQueueIntegrationTests
{
    private readonly ITestOutputHelper _output;

    public DocumentQueueIntegrationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    private (IAsyncDocumentQueuePublisher Publisher, DocumentIngestionBackgroundWorker Worker, MockAiServiceClient AiClient) CreateTestEnvironment(
        int maxWorkers = 2,
        int maxRetries = 2,
        int baseDelayMs = 20)
    {
        var services = new ServiceCollection();
        services.AddLogging(b => b.AddDebug());

        var options = new DocumentQueueOptions
        {
            MaxConcurrentWorkers = maxWorkers,
            ChannelCapacity = 500,
            MaxRetryAttempts = maxRetries,
            BaseRetryDelayMilliseconds = baseDelayMs,
            MaxRetryDelayMilliseconds = 500
        };

        var mockAiClient = new MockAiServiceClient();
        services.AddSingleton<IAiServiceClient>(mockAiClient);

        var serviceProvider = services.BuildServiceProvider();
        var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();

        var publisherLogger = LoggerFactory.Create(b => b.AddDebug()).CreateLogger<AsyncDocumentQueuePublisher>();
        var publisher = new AsyncDocumentQueuePublisher(Options.Create(options), publisherLogger);

        var workerLogger = LoggerFactory.Create(b => b.AddDebug()).CreateLogger<DocumentIngestionBackgroundWorker>();
        var worker = new DocumentIngestionBackgroundWorker(publisher, scopeFactory, Options.Create(options), workerLogger);

        return (publisher, worker, mockAiClient);
    }

    [Fact]
    public async Task EnqueueAsync_ShouldInstantlyEnqueueJobWithoutBlocking()
    {
        var (publisher, _, _) = CreateTestEnvironment();

        var tenantId = "ten_test_alpha";
        var documentUri = "mock://enterprise-architecture-spec.pdf";
        var jobId = Guid.NewGuid().ToString("N");

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var job = await publisher.EnqueueAsync(
            tenantId: tenantId,
            documentUri: documentUri,
            jobId: jobId,
            metadata: new Dictionary<string, object> { ["title"] = "Enterprise Architecture Spec" });
        stopwatch.Stop();

        _output.WriteLine($"Job enqueued in {stopwatch.Elapsed.TotalMilliseconds:F3}ms. JobId: {job.JobId}");

        Assert.Equal(jobId, job.JobId);
        Assert.Equal(tenantId, job.TenantId);
        Assert.Equal(documentUri, job.DocumentUri);
        Assert.Equal("Queued", job.Status);
        Assert.True(stopwatch.Elapsed.TotalMilliseconds < 50, "Enqueue must be non-blocking and immediate");

        var metrics = publisher.GetMetrics();
        Assert.Equal(1, metrics.TotalJobs);
        Assert.Equal(1, metrics.QueueDepth);
    }

    [Fact]
    public async Task Worker_ShouldProcessJobThroughFullLifecycle_ToIndexed()
    {
        var (publisher, worker, aiClient) = CreateTestEnvironment(maxWorkers: 1);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        // Start background worker
        var workerTask = worker.StartAsync(cts.Token);

        var tenantId = "ten_finance_prod";
        var jobId = "job_lifecycle_test_001";
        var documentUri = "mock://quarterly-sec-10k.txt";

        var enqueuedJob = await publisher.EnqueueAsync(
            tenantId: tenantId,
            documentUri: documentUri,
            jobId: jobId,
            metadata: new Dictionary<string, object>
            {
                ["title"] = "Q3 SEC 10-K Report",
                ["content"] = "Audited financial balance sheet and corporate cash reserves."
            },
            cancellationToken: cts.Token);

        // Wait for worker to transition job to Indexed
        DocumentIngestionJob? tracked = null;
        for (var i = 0; i < 40; i++)
        {
            tracked = await publisher.GetJobStatusAsync(jobId, cts.Token);
            if (tracked?.Status == "Indexed")
            {
                break;
            }
            await Task.Delay(50, cts.Token);
        }

        await worker.StopAsync(CancellationToken.None);

        Assert.NotNull(tracked);
        Assert.Equal("Indexed", tracked.Status);
        Assert.True(tracked.ChunksIndexed >= 1);
        Assert.True(tracked.ProcessingTimeMs > 0);
        Assert.Null(tracked.ErrorMessage);

        _output.WriteLine($"Job {jobId} completed successfully. Chunks: {tracked.ChunksIndexed}, Time: {tracked.ProcessingTimeMs:F1}ms");
    }

    [Fact]
    public async Task Worker_ShouldRetryWithBackoff_OnTransientFailure_AndEventuallyIndex()
    {
        var (publisher, worker, aiClient) = CreateTestEnvironment(maxWorkers: 1, maxRetries: 3, baseDelayMs: 25);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        // Simulate transient network failure on attempt 1, success on attempt 2
        aiClient.FailFirstAttempt = true;

        var workerTask = worker.StartAsync(cts.Token);

        var jobId = "job_retry_backoff_001";
        await publisher.EnqueueAsync(
            tenantId: "ten_retry_demo",
            documentUri: "mock://transient-retry-document.pdf",
            jobId: jobId,
            metadata: new Dictionary<string, object>
            {
                ["title"] = "Transient Failure Test Document",
                ["content"] = "Grounded content surviving downstream HTTP gateway timeouts."
            },
            cancellationToken: cts.Token);

        DocumentIngestionJob? tracked = null;
        for (var i = 0; i < 50; i++)
        {
            tracked = await publisher.GetJobStatusAsync(jobId, cts.Token);
            if (tracked?.Status == "Indexed")
            {
                break;
            }
            await Task.Delay(50, cts.Token);
        }

        await worker.StopAsync(CancellationToken.None);

        Assert.NotNull(tracked);
        Assert.Equal("Indexed", tracked.Status);
        Assert.Equal(1, tracked.RetryCount);
        _output.WriteLine($"Job successfully recovered and indexed after {tracked.RetryCount} retry backoffs.");
    }

    [Fact]
    public async Task Worker_ShouldRouteToDeadLetterQueue_WhenMaxRetriesExceeded()
    {
        var (publisher, worker, _) = CreateTestEnvironment(maxWorkers: 1, maxRetries: 2, baseDelayMs: 15);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var workerTask = worker.StartAsync(cts.Token);

        var jobId = "job_dead_letter_001";
        // Unresolvable path with no metadata content
        await publisher.EnqueueAsync(
            tenantId: "ten_dlq_test",
            documentUri: "file:///non/existent/corporate_vault_path_not_found.bin",
            jobId: jobId,
            cancellationToken: cts.Token);

        DocumentIngestionJob? tracked = null;
        for (var i = 0; i < 50; i++)
        {
            tracked = await publisher.GetJobStatusAsync(jobId, cts.Token);
            if (tracked?.Status == "DeadLetter")
            {
                break;
            }
            await Task.Delay(50, cts.Token);
        }

        await worker.StopAsync(CancellationToken.None);

        Assert.NotNull(tracked);
        Assert.Equal("DeadLetter", tracked.Status);
        Assert.Equal(2, tracked.RetryCount);
        Assert.NotNull(tracked.ErrorMessage);
        Assert.Contains("FileNotFoundException", tracked.ErrorMessage);

        var dlqJobs = await publisher.GetDeadLetterJobsAsync();
        Assert.Contains(dlqJobs, j => j.JobId == jobId);

        var metrics = publisher.GetMetrics();
        Assert.True(metrics.DeadLetterCount >= 1);

        _output.WriteLine($"Job correctly dead-lettered after {tracked.RetryCount} failed attempts. Reason: {tracked.ErrorMessage}");
    }

    [Fact]
    public async Task ConcurrentWorkerProcessing_ShouldScaleWithoutBlocking()
    {
        var (publisher, worker, _) = CreateTestEnvironment(maxWorkers: 4, maxRetries: 1);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(6));

        var workerTask = worker.StartAsync(cts.Token);

        const int jobCount = 10;
        var jobIds = Enumerable.Range(1, jobCount).Select(i => $"job_concurrent_{i:D2}").ToList();

        foreach (var jid in jobIds)
        {
            await publisher.EnqueueAsync(
                tenantId: "ten_concurrent_batch",
                documentUri: $"mock://document_{jid}.txt",
                jobId: jid,
                metadata: new Dictionary<string, object>
                {
                    ["title"] = $"Concurrent Doc {jid}",
                    ["content"] = $"High throughput worker batching document test {jid}."
                },
                cancellationToken: cts.Token);
        }

        // Wait for all to reach Indexed
        for (var i = 0; i < 60; i++)
        {
            var allIndexed = true;
            foreach (var jid in jobIds)
            {
                var j = await publisher.GetJobStatusAsync(jid, cts.Token);
                if (j?.Status != "Indexed")
                {
                    allIndexed = false;
                    break;
                }
            }

            if (allIndexed)
            {
                break;
            }
            await Task.Delay(50, cts.Token);
        }

        await worker.StopAsync(CancellationToken.None);

        foreach (var jid in jobIds)
        {
            var job = await publisher.GetJobStatusAsync(jid);
            Assert.NotNull(job);
            Assert.Equal("Indexed", job.Status);
        }

        var metrics = publisher.GetMetrics();
        Assert.Equal(jobCount, metrics.TotalJobs);
        Assert.Equal(jobCount, metrics.ByStatus["Indexed"]);
        Assert.Equal(0, metrics.QueueDepth);

        _output.WriteLine($"Successfully processed {jobCount} jobs concurrently across 4 background workers.");
    }
}

public class MockAiServiceClient : IAiServiceClient
{
    private int _ingestCalls = 0;
    public bool FailFirstAttempt { get; set; } = false;

    public Task<AiServiceHealthDto> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new AiServiceHealthDto
        {
            Status = "healthy",
            Service = "MockAiService",
            GroqConfigured = true,
            GroqModel = "llama3-70b-8192",
            LangGraphAgentActive = true
        });
    }

    public Task<DocumentIngestionResponseDto> IngestDocumentAsync(
        DocumentIngestionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        _ingestCalls++;
        if (FailFirstAttempt && _ingestCalls == 1)
        {
            throw new HttpRequestException("Mock transient downstream network timeout");
        }

        var chunks = Math.Max(1, (request.Content.Length + 799) / 800);
        return Task.FromResult(new DocumentIngestionResponseDto
        {
            DocumentId = request.DocumentId,
            TenantId = request.TenantId,
            ChunksIndexed = chunks,
            TotalTenantVectorCount = chunks * 2
        });
    }

    public Task<HybridSearchResponseDto> SearchHybridAsync(HybridSearchRequestDto request, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new HybridSearchResponseDto { Query = request.Query, TenantId = request.TenantId });
    }

    public Task<RagQueryResponseDto> QueryRagAsync(RagQueryRequestDto request, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new RagQueryResponseDto
        {
            Query = request.Query,
            TenantId = request.TenantId,
            SynthesizedResponse = "Mock grounded answer",
            ModelUsed = "llama3-70b-8192",
            Provider = "groq-mock"
        });
    }

    public Task<DocumentIngestionResponseDto> SynchronizeDocumentAsync(
        Guid documentId,
        string title,
        string content,
        IDictionary<string, object>? metadata = null,
        CancellationToken cancellationToken = default)
    {
        return IngestDocumentAsync(new DocumentIngestionRequestDto
        {
            DocumentId = documentId.ToString(),
            TenantId = "mock-tenant",
            Content = $"# {title}\n\n{content}"
        }, cancellationToken);
    }

    public Task<bool> SynchronizeBatchDocumentsAsync(
        IEnumerable<(Guid DocumentId, string Title, string Content, IDictionary<string, object>? Metadata)> documents,
        int maxDegreeOfParallelism = 4,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }
}
