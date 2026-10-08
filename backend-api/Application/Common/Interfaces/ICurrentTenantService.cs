namespace EnterpriseApi.Application.Common.Interfaces;

/// <summary>
/// Provides resolution and context verification for the active tenant associated with the incoming HTTP request.
/// </summary>
public interface ICurrentTenantService
{
    /// <summary>
    /// Gets the resolved tenant GUID for the active request execution context.
    /// </summary>
    Guid? TenantId { get; }

    /// <summary>
    /// Gets the resolved alphanumeric tenant identifier slug.
    /// </summary>
    string? TenantIdentifier { get; }

    /// <summary>
    /// Sets the active tenant context explicitly for the current scope.
    /// </summary>
    /// <param name="tenantId">The resolved tenant primary key.</param>
    /// <param name="tenantIdentifier">The resolved tenant identifier slug.</param>
    void SetTenant(Guid tenantId, string tenantIdentifier);
}
