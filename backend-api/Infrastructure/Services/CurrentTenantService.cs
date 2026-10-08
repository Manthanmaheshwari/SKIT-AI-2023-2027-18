using System.Security.Claims;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Domain.Constants;
using Microsoft.AspNetCore.Http;

namespace EnterpriseApi.Infrastructure.Services;

/// <summary>
/// Implements tenant resolution for the current HTTP request scope via headers or claims.
/// </summary>
public class CurrentTenantService : ICurrentTenantService
{
    private Guid? _tenantId;
    private string? _tenantIdentifier;

    /// <summary>
    /// Gets the resolved tenant primary key GUID.
    /// </summary>
    public Guid? TenantId => _tenantId;

    /// <summary>
    /// Gets the resolved alphanumeric tenant identifier slug.
    /// </summary>
    public string? TenantIdentifier => _tenantIdentifier;

    /// <summary>
    /// Initializes a new instance of the <see cref="CurrentTenantService"/> class and extracts tenant context.
    /// </summary>
    /// <param name="httpContextAccessor">Accessor for the current HTTP request context.</param>
    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return;
        }

        // 1. Resolve from authenticated user claims
        var tenantIdClaim = httpContext.User.FindFirst(CustomClaimTypes.TenantId)?.Value;
        if (!string.IsNullOrWhiteSpace(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var parsedClaimId))
        {
            _tenantId = parsedClaimId;
        }

        var tenantSlugClaim = httpContext.User.FindFirst(CustomClaimTypes.TenantIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(tenantSlugClaim))
        {
            _tenantIdentifier = tenantSlugClaim;
        }

        // 2. Fallback to custom HTTP header: X-Tenant-ID or X-Tenant-Identifier
        if (!_tenantId.HasValue && httpContext.Request.Headers.TryGetValue("X-Tenant-ID", out var headerTenantId))
        {
            if (Guid.TryParse(headerTenantId.FirstOrDefault(), out var parsedHeaderId))
            {
                _tenantId = parsedHeaderId;
            }
        }

        if (string.IsNullOrWhiteSpace(_tenantIdentifier) && httpContext.Request.Headers.TryGetValue("X-Tenant-Identifier", out var headerTenantSlug))
        {
            _tenantIdentifier = headerTenantSlug.FirstOrDefault();
        }
    }

    /// <summary>
    /// Sets the active tenant context explicitly for the current scope.
    /// </summary>
    /// <param name="tenantId">The resolved tenant primary key.</param>
    /// <param name="tenantIdentifier">The resolved tenant identifier slug.</param>
    public void SetTenant(Guid tenantId, string tenantIdentifier)
    {
        _tenantId = tenantId;
        _tenantIdentifier = tenantIdentifier;
    }
}
