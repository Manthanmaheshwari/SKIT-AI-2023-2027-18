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
}
