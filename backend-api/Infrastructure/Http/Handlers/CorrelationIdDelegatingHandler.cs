using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Infrastructure.Http.Handlers;

/// <summary>
/// Delegating handler ensuring all outbound inter-service HTTP requests carry an X-Correlation-ID
/// header for end-to-end distributed tracing across microservice boundaries.
/// </summary>
public class CorrelationIdDelegatingHandler : DelegatingHandler
{
    private const string CorrelationIdHeaderName = "X-Correlation-ID";
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<CorrelationIdDelegatingHandler> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CorrelationIdDelegatingHandler"/> class.
    /// </summary>
    public CorrelationIdDelegatingHandler(
        IHttpContextAccessor httpContextAccessor,
        ILogger<CorrelationIdDelegatingHandler> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // 1. Resolve or generate correlation identifier
        string? correlationId = null;

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext != null)
        {
            if (httpContext.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var incomingCorrId))
            {
                correlationId = incomingCorrId.FirstOrDefault();
            }
            else if (httpContext.Items.TryGetValue(CorrelationIdHeaderName, out var itemCorrId) && itemCorrId != null)
            {
                correlationId = itemCorrId.ToString();
            }
        }

        if (string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = $"corr-ai_{Guid.NewGuid():N}";
        }

        // 2. Attach to outgoing request headers
        if (!request.Headers.Contains(CorrelationIdHeaderName))
        {
            request.Headers.Add(CorrelationIdHeaderName, correlationId);
        }

        var endpoint = request.RequestUri?.PathAndQuery ?? request.RequestUri?.ToString() ?? "Unknown";
        var method = request.Method.Method;

        _logger.LogDebug(
            "Dispatching HTTP {Method} {Endpoint} [CorrelationId: {CorrelationId}]",
            method, endpoint, correlationId);

        var stopwatch = Stopwatch.StartNew();
        HttpResponseMessage? response = null;

        try
        {
            response = await base.SendAsync(request, cancellationToken);
            stopwatch.Stop();

            _logger.LogInformation(
                "Completed HTTP {Method} {Endpoint} with {StatusCode} in {ElapsedMs:F1}ms [CorrelationId: {CorrelationId}]",
                method, endpoint, (int)response.StatusCode, stopwatch.Elapsed.TotalMilliseconds, correlationId);

            // 3. Mirror correlation header into response headers for caller inspection
            if (!response.Headers.Contains(CorrelationIdHeaderName))
            {
                response.Headers.Add(CorrelationIdHeaderName, correlationId);
            }

            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(
                ex,
                "Failed HTTP {Method} {Endpoint} after {ElapsedMs:F1}ms [CorrelationId: {CorrelationId}]: {Message}",
                method, endpoint, stopwatch.Elapsed.TotalMilliseconds, correlationId, ex.Message);
            throw;
        }
    }
}
