using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Middleware;

/// <summary>
/// Resolves and validates tenant context on inbound requests before hitting controller endpoints.
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantResolutionMiddleware"/> class.
    /// </summary>
    /// <param name="next">The downstream pipeline delegate.</param>
    /// <param name="logger">The logger instance.</param>
    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Resolves tenant identifier from authentication claims or custom request headers.
    /// </summary>
    /// <param name="context">The active HTTP context.</param>
    /// <param name="tenantService">The scoped tenant service.</param>
    /// <param name="dbContext">The enterprise database context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context, ICurrentTenantService tenantService, ApplicationDbContext dbContext)
    {
        // Check if user is authenticated with a tenant claim
        var tenantClaim = context.User.FindFirst(CustomClaimTypes.TenantId)?.Value;
        if (!string.IsNullOrWhiteSpace(tenantClaim) && Guid.TryParse(tenantClaim, out var tenantId))
        {
            var tenantSlug = context.User.FindFirst(CustomClaimTypes.TenantIdentifier)?.Value ?? string.Empty;
            tenantService.SetTenant(tenantId, tenantSlug);
            context.Items["TenantId"] = tenantId;
            context.Items["TenantIdentifier"] = tenantSlug;
        }
        else if (context.Request.Headers.TryGetValue("X-Tenant-Identifier", out var headerTenantSlug))
        {
            var slug = headerTenantSlug.ToString();
            var tenant = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Identifier.ToLower() == slug.ToLower());

            if (tenant != null && tenant.IsActive)
            {
                tenantService.SetTenant(tenant.Id, tenant.Identifier);
                context.Items["TenantId"] = tenant.Id;
                context.Items["TenantIdentifier"] = tenant.Identifier;
            }
        }

        await _next(context);
    }
}
