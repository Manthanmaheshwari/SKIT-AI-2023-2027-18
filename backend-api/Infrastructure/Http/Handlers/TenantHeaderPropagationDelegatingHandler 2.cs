using EnterpriseApi.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Infrastructure.Http.Handlers;

/// <summary>
/// Delegating handler ensuring that multi-tenant boundary parameters (X-Tenant-ID and X-Tenant-Identifier)
/// are injected into all outbound requests to preserve data isolation inside the Python AI microservice.
/// </summary>
public class TenantHeaderPropagationDelegatingHandler : DelegatingHandler
{
    private readonly ICurrentTenantService _currentTenantService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TenantHeaderPropagationDelegatingHandler> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantHeaderPropagationDelegatingHandler"/> class.
    /// </summary>
    public TenantHeaderPropagationDelegatingHandler(
        ICurrentTenantService currentTenantService,
        IHttpContextAccessor httpContextAccessor,
        ILogger<TenantHeaderPropagationDelegatingHandler> logger)
    {
        _currentTenantService = currentTenantService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // 1. Resolve tenant context from scoped service
        string? tenantId = _currentTenantService.TenantId?.ToString();
        string? tenantSlug = _currentTenantService.TenantIdentifier;

        // 2. Fallback to HttpContext items if scoped service was not initialized
        var httpContext = _httpContextAccessor.HttpContext;
        if (string.IsNullOrWhiteSpace(tenantId) && httpContext != null)
        {
            if (httpContext.Items.TryGetValue("TenantId", out var itemVal) && itemVal != null)
            {
                tenantId = itemVal.ToString();
            }
            else if (httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var headerTenantId))
            {
                tenantId = headerTenantId.ToString();
            }

            if (httpContext.Items.TryGetValue("TenantIdentifier", out var slugVal) && slugVal != null)
            {
                tenantSlug = slugVal.ToString();
            }
            else if (httpContext.Request.Headers.TryGetValue("X-Tenant-Identifier", out var headerSlug))
            {
                tenantSlug = headerSlug.ToString();
            }
        }

        // 3. Inject X-Tenant-ID header if not already present
        if (!string.IsNullOrWhiteSpace(tenantId) && !request.Headers.Contains("X-Tenant-ID"))
        {
            request.Headers.Add("X-Tenant-ID", tenantId);
        }

        // 4. Inject X-Tenant-Identifier header if present
        if (!string.IsNullOrWhiteSpace(tenantSlug) && !request.Headers.Contains("X-Tenant-Identifier"))
        {
            request.Headers.Add("X-Tenant-Identifier", tenantSlug);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
