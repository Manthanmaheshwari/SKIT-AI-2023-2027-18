using System.Security.Claims;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Domain.Enums;
using EnterpriseApi.Infrastructure.Authorization.Requirements;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Infrastructure.Authorization.Handlers;

/// <summary>
/// Enforces Document Role-Based Access Control (RBAC) policies based on JWT token role claims
/// and document classification sensitivity tiers (Public, Internal, Confidential, Restricted).
/// </summary>
/// <remarks>
/// Security Boundaries:
/// - Unauthenticated principals are rejected immediately.
/// - Multi-tenant isolation: User's tenant claim must match the resource's tenant.
/// - 'Confidential' documents strictly disallow standard users (Viewer role or unprivileged).
/// - 'Restricted' documents require Tenant Administrator credentials.
/// - Authorization.Succeed is executed ONLY when all strict boundaries and clearance checks succeed.
/// </remarks>
public class DocumentClassificationAuthorizationHandler : AuthorizationHandler<DocumentClassificationRequirement, ISecuredDocument>
{
    private readonly ILogger<DocumentClassificationAuthorizationHandler> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentClassificationAuthorizationHandler"/> class.
    /// </summary>
    /// <param name="logger">The structured security logger instance.</param>
    public DocumentClassificationAuthorizationHandler(ILogger<DocumentClassificationAuthorizationHandler> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Evaluates the authorization requirement against the incoming claims principal and document resource.
    /// </summary>
    /// <param name="context">The authorization handler context containing user claims and requirements.</param>
    /// <param name="requirement">The document classification requirement being evaluated.</param>
    /// <param name="resource">The secured document resource implementing <see cref="ISecuredDocument"/>.</param>
    /// <returns>A completed task representing the asynchronous evaluation.</returns>
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DocumentClassificationRequirement requirement,
        ISecuredDocument resource)
    {
        // 1. Validate Principal Authentication State
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            _logger.LogWarning(
                "Security Audit: Access Denied. Unauthenticated principal attempted to access document {DocumentId} with classification {Classification}.",
                resource.Id,
                resource.Classification);

            return Task.CompletedTask;
        }

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value
            ?? "UnknownUser";

        // 2. Validate Multi-Tenant Boundary Isolation (Defense-in-Depth)
        var tenantIdClaim = context.User.FindFirst(CustomClaimTypes.TenantId)?.Value;
        if (!Guid.TryParse(tenantIdClaim, out var userTenantId) || userTenantId != resource.TenantId)
        {
            _logger.LogWarning(
                "Security Alert: Cross-Tenant Boundary Violation. User {UserId} (Tenant: {UserTenantId}) attempted unauthorized access to Document {DocumentId} (Tenant: {ResourceTenantId}).",
                userId,
                tenantIdClaim,
                resource.Id,
                resource.TenantId);

            // Fail immediately to prevent cross-tenant leakage
            context.Fail();
            return Task.CompletedTask;
        }

        // 3. Extract Role Claims from Incoming JWT Token
        // Support both standard URI claim (ClaimTypes.Role) and short-form JWT claim ("role")
        var userRoles = context.User.Claims
            .Where(c => c.Type == ClaimTypes.Role ||
                        c.Type.Equals("role", StringComparison.OrdinalIgnoreCase) ||
                        c.Type.Equals(ClaimTypes.Role, StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (userRoles.Count == 0)
        {
            _logger.LogWarning(
                "Security Audit: Access Denied. User {UserId} has no role claims in JWT token. Document {DocumentId} access refused.",
                userId,
                resource.Id);

            return Task.CompletedTask;
        }

        // 4. Evaluate Role Clearance against Document Classification Level
        var isAuthorized = EvaluateClearance(userRoles, resource.Classification, userId, resource.Id);

        if (isAuthorized)
        {
            _logger.LogInformation(
                "Security Audit: Access Granted. User {UserId} with roles [{Roles}] successfully authorized for {Classification} document {DocumentId}.",
                userId,
                string.Join(", ", userRoles),
                resource.Classification,
                resource.Id);

            // RETURN Authorization.Succeed only if strict boundaries are met
            context.Succeed(requirement);
        }
        else
        {
            _logger.LogWarning(
                "Security Audit: Access Denied. User {UserId} with roles [{Roles}] does not meet the clearance requirement for {Classification} document {DocumentId}.",
                userId,
                string.Join(", ", userRoles),
                resource.Classification,
                resource.Id);

            // If a standard user deliberately attempted to access a Confidential or Restricted document,
            // log an elevated security boundary warning.
            if (resource.Classification is ClassificationLevel.Confidential or ClassificationLevel.Restricted &&
                !userRoles.Contains(RoleConstants.Admin))
            {
                _logger.LogWarning(
                    "Security Breach Attempt: Standard/non-privileged user {UserId} blocked from accessing high-tier '{Classification}' document {DocumentId}.",
                    userId,
                    resource.Classification,
                    resource.Id);
            }
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Evaluates role clearance against the requested document classification level.
    /// Strict boundary: Standard users (e.g., Viewer or non-elevated roles) cannot access Confidential documents.
    /// </summary>
    private bool EvaluateClearance(
        HashSet<string> roles,
        ClassificationLevel classification,
        string userId,
        Guid documentId)
    {
        // Tenant Administrator role bypasses classification barriers within the tenant boundary
        if (roles.Contains(RoleConstants.Admin))
        {
            return true;
        }

        switch (classification)
        {
            case ClassificationLevel.Public:
                // Any authenticated role within the tenant has access to Public documents
                return true;

            case ClassificationLevel.Internal:
                // Internal documents are accessible by standard users (Viewer, Researcher, Admin)
                return roles.Contains(RoleConstants.Viewer) ||
                       roles.Contains(RoleConstants.Researcher);

            case ClassificationLevel.Confidential:
                // STRICT BOUNDARY: Standard users (Viewer or default roles) CANNOT access Confidential tier documents.
                // Researcher or Admin role is required.
                if (roles.Contains(RoleConstants.Researcher))
                {
                    return true;
                }

                // Explicit denial for standard Viewer or any role lacking Researcher/Admin privilege
                return false;

            case ClassificationLevel.Restricted:
                // Strictly restricted to Administrators only (handled by top-level check)
                return false;

            default:
                _logger.LogError("Unrecognized ClassificationLevel '{Classification}' encountered for Document {DocumentId}.", classification, documentId);
                return false;
        }
    }
}
