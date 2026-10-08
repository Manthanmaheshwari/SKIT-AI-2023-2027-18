namespace EnterpriseApi.Domain.Constants;

/// <summary>
/// Defines custom claim types utilized in multi-tenant JWT generation and policy evaluations.
/// </summary>
public static class CustomClaimTypes
{
    /// <summary>
    /// Claim identifying the tenant GUID to which the authenticated subject belongs.
    /// </summary>
    public const string TenantId = "tenant_id";

    /// <summary>
    /// Claim identifying the alphanumeric tenant slug or human-readable identifier.
    /// </summary>
    public const string TenantIdentifier = "tenant_identifier";

    /// <summary>
    /// Claim identifying the legal or organizational name of the tenant.
    /// </summary>
    public const string TenantName = "tenant_name";
}
