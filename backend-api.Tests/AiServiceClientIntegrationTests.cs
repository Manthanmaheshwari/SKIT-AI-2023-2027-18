using System.Net;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models.AiService;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Extensions;
using EnterpriseApi.Infrastructure.Http;
using EnterpriseApi.Infrastructure.Http.CircuitBreaker;
using EnterpriseApi.Infrastructure.Http.Handlers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;
using Xunit.Abstractions;

namespace EnterpriseApi.Tests;

public class AiServiceClientIntegrationTests
{
    private readonly ITestOutputHelper _output;
    private readonly IServiceProvider _serviceProvider;

    public AiServiceClientIntegrationTests(ITestOutputHelper output)
    {
        _output = output;

        var inMemoryConfig = new Dictionary<string, string?>
        {
            ["Services:AiService:BaseUrl"] = "http://127.0.0.1:8000",
            ["Services:AiService:ApiKey"] = "EnterpriseAiServiceInternalSharedSecret2026!",
            ["Services:AiService:TimeoutSeconds"] = "45",
            ["Services:AiService:ClientServiceName"] = "EnterpriseApi-Gateway",
            ["Services:AiService:MaxRetryAttempts"] = "2",
            ["Services:AiService:BaseDelayMilliseconds"] = "100",
            ["Services:AiService:MaxDelayMilliseconds"] = "1000",
            ["Services:AiService:CircuitBreakerFailureThreshold"] = "5",
            ["Services:AiService:CircuitBreakerBreakDurationSeconds"] = "10"
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemoryConfig)
            .Build();

        var services = new ServiceCollection();
        services.AddLogging(builder =>
        {
            builder.AddDebug();
            builder.SetMinimumLevel(LogLevel.Debug);
        });

        services.AddHttpContextAccessor();

        // Mock or stub current tenant service
        var mockTenantService = new TestCurrentTenantService
        {
            TenantId = Guid.Parse("94a73f82-31ec-46bc-92cb-5e16f5c0981b"),
            TenantIdentifier = "skit-ai-labs"
        };
        services.AddSingleton<ICurrentTenantService>(mockTenantService);

        // Register the real inter-service client and resilience handlers
        services.AddAiMicroserviceClient(configuration);

        _serviceProvider = services.BuildServiceProvider();
    }

    [Fact]
    public async Task CheckHealthAsync_ShouldReturnHealthyStatusWithLangGraphActive()
    {
        var client = _serviceProvider.GetRequiredService<IAiServiceClient>();

        var health = await client.CheckHealthAsync();

        _output.WriteLine($"Health Status: {health.Status}");
        _output.WriteLine($"Service: {health.Service}");
        _output.WriteLine($"Groq Configured: {health.GroqConfigured}");
        _output.WriteLine($"Groq Model: {health.GroqModel}");
        _output.WriteLine($"LangGraph CRAG Active: {health.LangGraphAgentActive}");
        _output.WriteLine($"Vector Count: {health.VectorCollectionCount}");
        _output.WriteLine($"Sparse Chunks Indexed: {health.SparseChunksIndexed}");

        Assert.Equal("healthy", health.Status);
        Assert.True(health.GroqConfigured, "Groq should be configured");
        Assert.NotEmpty(health.GroqModel);
        Assert.True(health.LangGraphAgentActive, "LangGraph CRAG agent should be active");
    }

    [Fact]
    public async Task QueryRagAsync_ShouldExecuteFullHybridRagPipeline_AndReturnGroundedSynthesis()
    {
        var client = _serviceProvider.GetRequiredService<IAiServiceClient>();

        var request = new RagQueryRequestDto
        {
            TenantId = "skit-ai-labs",
            Query = "What is Corrective RAG and how does it evaluate context confidence?",
            TopK = 3,
            Temperature = 0.2
        };

        _output.WriteLine($"Dispatching RAG query: '{request.Query}' (Tenant: '{request.TenantId}')");

        var response = await client.QueryRagAsync(request);

        _output.WriteLine($"Received Response from Provider: {response.Provider}");
        _output.WriteLine($"Model Used: {response.ModelUsed}");
        _output.WriteLine($"Latency: {response.LatencyMs}ms");
        _output.WriteLine($"Retrieved Documents Count: {response.RetrievedDocuments.Count}");
        _output.WriteLine($"Citations Count: {response.Citations.Count}");
        _output.WriteLine($"Synthesized Response:\n{response.SynthesizedResponse}");

        Assert.NotNull(response);
        Assert.NotEmpty(response.SynthesizedResponse);
        Assert.NotEmpty(response.ModelUsed);
        Assert.True(response.LatencyMs > 0);
        Assert.NotEmpty(response.RetrievedDocuments);
        Assert.NotEmpty(response.Citations);

        // Verify visual citation structure
        var firstCitation = response.Citations[0];
        Assert.NotEmpty(firstCitation.DocumentId);
        Assert.True(firstCitation.Page >= 1);
        Assert.NotEmpty(firstCitation.Snippet);

        _output.WriteLine($"First Citation: [Document: {firstCitation.DocumentId}, Page: {firstCitation.Page}] Snippet: {firstCitation.Snippet}");
    }

    [Fact]
    public async Task SearchHybridAsync_ShouldRetrieveFusedRankedCandidates()
    {
        var client = _serviceProvider.GetRequiredService<IAiServiceClient>();

        var request = new HybridSearchRequestDto
        {
            TenantId = "skit-ai-labs",
            Query = "Reciprocal Rank Fusion smoothing parameter k=60",
            TopK = 3
        };

        var response = await client.SearchHybridAsync(request);

        _output.WriteLine($"Query: {response.Query}");
        _output.WriteLine($"Results count: {response.Results.Count}");

        Assert.NotNull(response);
        Assert.NotEmpty(response.Results);

        foreach (var doc in response.Results)
        {
            _output.WriteLine($"Doc ID: {doc.DocumentId} | Chunk ID: {doc.ChunkId} | RRF Score: {doc.RrfScore:F4}");
            Assert.True(doc.RrfScore > 0);
            Assert.NotEmpty(doc.Content);
        }
    }
}

public class TestCurrentTenantService : ICurrentTenantService
{
    public Guid? TenantId { get; set; }
    public string? TenantIdentifier { get; set; }

    public void SetTenant(Guid tenantId, string tenantIdentifier)
    {
        TenantId = tenantId;
        TenantIdentifier = tenantIdentifier;
    }
}
