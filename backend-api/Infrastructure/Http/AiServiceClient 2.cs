using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EnterpriseApi.Application.Common.Exceptions;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models.AiService;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Infrastructure.Http;

/// <summary>
/// Production typed HTTP client for secure inter-service communication and document synchronization
/// with the Python FastAPI AI microservice.
/// </summary>
public class AiServiceClient : IAiServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ICurrentTenantService _currentTenantService;
    private readonly ILogger<AiServiceClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceClient"/> class.
    /// </summary>
    /// <param name="httpClient">The configured HTTP client instance.</param>
    /// <param name="currentTenantService">The resolved multi-tenant context service.</param>
    /// <param name="logger">The client logger.</param>
    public AiServiceClient(
        HttpClient httpClient,
        ICurrentTenantService currentTenantService,
        ILogger<AiServiceClient> logger)
    {
        _httpClient = httpClient;
        _currentTenantService = currentTenantService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<AiServiceHealthDto> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        const string endpoint = "/health";
        try
        {
            using var response = await _httpClient.GetAsync(endpoint, cancellationToken);
            await EnsureSuccessOrThrowAsync(response, endpoint, cancellationToken);

            var healthDto = await response.Content.ReadFromJsonAsync<AiServiceHealthDto>(JsonOptions, cancellationToken);
            return healthDto ?? new AiServiceHealthDto
            {
                Status = "unknown",
                Service = "Enterprise AI Inference & Retrieval Engine"
            };
        }
        catch (AiServiceException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute health check against AI microservice at '{Endpoint}'.", endpoint);
            throw new AiServiceTransientException("AI microservice health probe failed.", HttpStatusCode.ServiceUnavailable, endpoint, innerException: ex);
        }
    }

    /// <inheritdoc />
    public async Task<DocumentIngestionResponseDto> IngestDocumentAsync(
        DocumentIngestionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        const string endpoint = "/api/v1/ingest";

        // Fallback to active tenant context if request model omitted tenant_id
        if (string.IsNullOrWhiteSpace(request.TenantId))
        {
            request.TenantId = ResolveCurrentTenantSlug();
        }

        _logger.LogInformation(
            "Dispatched document ingestion for DocId='{DocId}' to tenant='{TenantId}' (Length: {Length} chars).",
            request.DocumentId, request.TenantId, request.Content.Length);

        using var response = await _httpClient.PostAsJsonAsync(endpoint, request, JsonOptions, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, endpoint, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<DocumentIngestionResponseDto>(JsonOptions, cancellationToken);
        if (result == null)
        {
            throw new AiServiceException("Received empty response payload from AI ingestion microservice.");
        }

        _logger.LogInformation(
            "Successfully ingested document '{DocId}' for tenant '{TenantId}'. Chunks indexed: {Chunks}, Total vectors: {Vectors}.",
            result.DocumentId, result.TenantId, result.ChunksIndexed, result.TotalTenantVectorCount);

        return result;
    }

    /// <inheritdoc />
    public async Task<HybridSearchResponseDto> SearchHybridAsync(
        HybridSearchRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        const string endpoint = "/api/v1/search/hybrid";

        if (string.IsNullOrWhiteSpace(request.TenantId))
        {
            request.TenantId = ResolveCurrentTenantSlug();
        }

        _logger.LogInformation(
            "Executing hybrid search query='{Query}' (Tenant: '{TenantId}', TopK: {TopK}).",
            request.Query, request.TenantId, request.TopK);

        using var response = await _httpClient.PostAsJsonAsync(endpoint, request, JsonOptions, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, endpoint, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<HybridSearchResponseDto>(JsonOptions, cancellationToken);
        return result ?? new HybridSearchResponseDto
        {
            Query = request.Query,
            TenantId = request.TenantId
        };
    }

    /// <inheritdoc />
    public async Task<RagQueryResponseDto> QueryRagAsync(
        RagQueryRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        const string endpoint = "/api/v1/rag/query";

        if (string.IsNullOrWhiteSpace(request.TenantId))
        {
            request.TenantId = ResolveCurrentTenantSlug();
        }

        _logger.LogInformation(
            "Submitting RAG inference inquiry '{Query}' (Tenant: '{TenantId}', TopK: {TopK}).",
            request.Query, request.TenantId, request.TopK);

        using var response = await _httpClient.PostAsJsonAsync(endpoint, request, JsonOptions, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, endpoint, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<RagQueryResponseDto>(JsonOptions, cancellationToken);
        if (result == null)
        {
            throw new AiServiceException("Received null synthesis payload from AI microservice RAG query.");
        }

        _logger.LogInformation(
            "Synthesized RAG response for tenant '{TenantId}' in {LatencyMs:F1}ms using model '{Model}'. Citations: {Count}.",
            result.TenantId, result.LatencyMs, result.ModelUsed, result.Citations.Count);

        return result;
    }

    /// <inheritdoc />
    public async Task<DocumentIngestionResponseDto> SynchronizeDocumentAsync(
        Guid documentId,
        string title,
        string content,
        IDictionary<string, object>? metadata = null,
        CancellationToken cancellationToken = default)
    {
        var tenantSlug = ResolveCurrentTenantSlug();

        var documentMetadata = new Dictionary<string, object>
        {
            ["title"] = title,
            ["synchronized_at_utc"] = DateTime.UtcNow.ToString("O"),
            ["source_system"] = "EnterpriseApi-Gateway",
            ["document_guid"] = documentId.ToString()
        };

        if (metadata != null)
        {
            foreach (var kvp in metadata)
            {
                documentMetadata[kvp.Key] = kvp.Value;
            }
        }

        // Prepend title header to facilitate keyword and dense matching
        var formattedContent = $"# {title}\n\n{content}";

        var ingestionRequest = new DocumentIngestionRequestDto
        {
            TenantId = tenantSlug,
            DocumentId = documentId.ToString(),
            Content = formattedContent,
            Metadata = documentMetadata
        };

        return await IngestDocumentAsync(ingestionRequest, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SynchronizeBatchDocumentsAsync(
        IEnumerable<(Guid DocumentId, string Title, string Content, IDictionary<string, object>? Metadata)> documents,
        int maxDegreeOfParallelism = 4,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(documents);

        var docList = documents.ToList();
        if (docList.Count == 0)
        {
            return true;
        }

        _logger.LogInformation(
            "Beginning batch synchronization of {Count} documents with max parallelism of {Parallelism}.",
            docList.Count, maxDegreeOfParallelism);

        var parallelOptions = new ParallelOptions
        {
            MaxDegreeOfParallelism = Math.Max(1, maxDegreeOfParallelism),
            CancellationToken = cancellationToken
        };

        var failedCount = 0;

        await Parallel.ForEachAsync(docList, parallelOptions, async (doc, ct) =>
        {
            try
            {
                await SynchronizeDocumentAsync(doc.DocumentId, doc.Title, doc.Content, doc.Metadata, ct);
            }
            catch (Exception ex)
            {
                Interlocked.Increment(ref failedCount);
                _logger.LogError(
                    ex,
                    "Failed to synchronize document '{DocId}' ('{Title}') during batch ingestion.",
                    doc.DocumentId, doc.Title);
            }
        });

        var success = failedCount == 0;
        _logger.LogInformation(
            "Batch synchronization finished. Processed: {Total}, Succeeded: {Success}, Failed: {Failed}.",
            docList.Count, docList.Count - failedCount, failedCount);

        return success;
    }

    private string ResolveCurrentTenantSlug()
    {
        var tenantSlug = _currentTenantService.TenantIdentifier;
        if (!string.IsNullOrWhiteSpace(tenantSlug))
        {
            return tenantSlug;
        }

        var tenantId = _currentTenantService.TenantId;
        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            return $"ten_{tenantId.Value:D}";
        }

        return "skit-ai-labs"; // Standard fallback demo tenant
    }

    private static async Task EnsureSuccessOrThrowAsync(
        HttpResponseMessage response,
        string endpoint,
        CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var correlationId = response.Headers.TryGetValues("X-Correlation-ID", out var corrValues)
            ? corrValues.FirstOrDefault()
            : null;

        string rawContent = string.Empty;
        try
        {
            rawContent = await response.Content.ReadAsStringAsync(cancellationToken);
        }
        catch
        {
            // Ignore content read failures on aborted streams
        }

        var (errorMessage, validationErrors) = ParseFastApiErrorDetail(rawContent);

        switch (response.StatusCode)
        {
            case HttpStatusCode.BadRequest:
            case HttpStatusCode.UnprocessableEntity: // 422 standard in FastAPI
                throw new AiServiceValidationException(
                    $"Validation error from AI microservice ({response.StatusCode}): {errorMessage}",
                    response.StatusCode,
                    endpoint,
                    correlationId,
                    rawContent,
                    validationErrors);

            case HttpStatusCode.Unauthorized:
            case HttpStatusCode.Forbidden:
                throw new AiServiceAuthenticationException(
                    $"Authorization denied by AI microservice ({response.StatusCode}): {errorMessage}",
                    response.StatusCode,
                    endpoint,
                    correlationId,
                    rawContent);

            case HttpStatusCode.InternalServerError:
            case HttpStatusCode.BadGateway:
            case HttpStatusCode.ServiceUnavailable:
            case HttpStatusCode.GatewayTimeout:
            case HttpStatusCode.TooManyRequests:
            case HttpStatusCode.RequestTimeout:
                throw new AiServiceTransientException(
                    $"Transient failure from AI microservice ({response.StatusCode}): {errorMessage}",
                    response.StatusCode,
                    endpoint,
                    correlationId,
                    rawContent);

            default:
                throw new AiServiceException(
                    $"AI microservice returned HTTP {(int)response.StatusCode}: {errorMessage}",
                    response.StatusCode,
                    endpoint,
                    correlationId,
                    rawContent);
        }
    }

    private static (string Message, List<string> ValidationErrors) ParseFastApiErrorDetail(string rawContent)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return ("No error response body provided.", errors);
        }

        try
        {
            using var doc = JsonDocument.Parse(rawContent);
            if (doc.RootElement.TryGetProperty("detail", out var detailElem))
            {
                if (detailElem.ValueKind == JsonValueKind.String)
                {
                    return (detailElem.GetString() ?? rawContent, errors);
                }

                if (detailElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in detailElem.EnumerateArray())
                    {
                        var msg = item.TryGetProperty("msg", out var m) ? m.GetString() : null;
                        var loc = item.TryGetProperty("loc", out var l) ? l.ToString() : null;
                        var entry = !string.IsNullOrEmpty(loc) ? $"{loc}: {msg}" : msg ?? item.ToString();
                        errors.Add(entry);
                    }

                    return (string.Join("; ", errors), errors);
                }

                return (detailElem.ToString(), errors);
            }

            if (doc.RootElement.TryGetProperty("message", out var msgElem))
            {
                return (msgElem.GetString() ?? rawContent, errors);
            }
        }
        catch (JsonException)
        {
            // Payload was not JSON
        }

        return (rawContent, errors);
    }
}
