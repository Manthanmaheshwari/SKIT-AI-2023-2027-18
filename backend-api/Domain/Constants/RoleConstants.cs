namespace EnterpriseApi.Domain.Constants;

/// <summary>
/// Defines standard application roles for authorization across the enterprise platform.
/// </summary>
public static class RoleConstants
{
    /// <summary>
    /// Administrator role with complete tenant configuration and user management permissions.
    /// </summary>
    public const string Admin = "Admin";

    /// <summary>
    /// Researcher role capable of initiating research queries, document ingestion, and prompt executions.
    /// </summary>
    public const string Researcher = "Researcher";

    /// <summary>
    /// Read-only user role with access strictly limited to reading reports and research outputs.
    /// </summary>
    public const string Viewer = "Viewer";

    /// <summary>
    /// Security lead role with access to circuit breaker telemetry and infrastructure diagnostics.
    /// </summary>
    public const string SecurityLead = "SecurityLead";
}

/// <summary>
/// Alias for backward compatibility with controllers referencing ApplicationRoles.
/// </summary>
public static class ApplicationRoles
{
    /// <inheritdoc cref="RoleConstants.Admin"/>
    public const string Admin = RoleConstants.Admin;

    /// <inheritdoc cref="RoleConstants.Researcher"/>
    public const string Researcher = RoleConstants.Researcher;

    /// <inheritdoc cref="RoleConstants.Viewer"/>
    public const string Viewer = RoleConstants.Viewer;

    /// <inheritdoc cref="RoleConstants.SecurityLead"/>
    public const string SecurityLead = RoleConstants.SecurityLead;
}
