using System.Net.Http.Headers;
using EnterpriseApi.Application.Common.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Infrastructure.Http.Handlers;

/// <summary>
/// Delegating handler responsible for securely attaching authentication and client identification headers
/// to all outbound HTTP requests destined for the Python FastAPI AI microservice.
/// </summary>
public class BearerTokenPropagationDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AiServiceOptions _options;
    private readonly ILogger<BearerTokenPropagationDelegatingHandler> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="BearerTokenPropagationDelegatingHandler"/> class.
    /// </summary>
    public BearerTokenPropagationDelegatingHandler(
        IHttpContextAccessor httpContextAccessor,
        IOptions<AiServiceOptions> options,
        ILogger<BearerTokenPropagationDelegatingHandler> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // 1. Enforce Accept: application/json
        if (!request.Headers.Accept.Any(h => h.MediaType == "application/json"))
        {
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        // 2. Identify originating enterprise client service
        if (!request.Headers.Contains("X-Client-Service"))
        {
            request.Headers.Add("X-Client-Service", _options.ClientServiceName);
        }

        // 3. Attach internal service API key
        if (!string.IsNullOrWhiteSpace(_options.ApiKey) && !request.Headers.Contains("X-API-Key"))
        {
            request.Headers.Add("X-API-Key", _options.ApiKey);
        }

        // 4. Propagate caller bearer token or fallback to service authentication token
        var httpContext = _httpContextAccessor.HttpContext;
        string? incomingAuthHeader = null;

        if (httpContext?.Request.Headers.TryGetValue("Authorization", out var authValues) == true)
        {
            incomingAuthHeader = authValues.FirstOrDefault();
        }

        if (!string.IsNullOrWhiteSpace(incomingAuthHeader))
        {
            // Propagate incoming caller bearer token downstream
            if (AuthenticationHeaderValue.TryParse(incomingAuthHeader, out var parsedAuth))
            {
                request.Headers.Authorization = parsedAuth;
            }
            else
            {
                request.Headers.TryAddWithoutValidation("Authorization", incomingAuthHeader);
            }
        }
        else if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            // Fallback to internal service bearer token when running background sync or unauthenticated calls
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
