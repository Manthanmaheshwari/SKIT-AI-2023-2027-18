namespace EnterpriseApi.Domain.Enums;

/// <summary>
/// Specifies the data classification tier and sensitivity level of an enterprise document.
/// Governs the RBAC access boundaries enforced during authorization policy evaluation.
/// </summary>
public enum ClassificationLevel
{
    /// <summary>
    /// Publicly accessible information with no confidentiality restrictions within the tenant.
    /// </summary>
    Public = 1,

    /// <summary>
    /// Standard internal information accessible by all authenticated tenant members (including standard viewers).
    /// </summary>
    Internal = 2,

    /// <summary>
    /// Sensitive business, intellectual, or research data restricted from standard users.
    /// Requires elevated roles (e.g., Researcher or Admin).
    /// </summary>
    Confidential = 3,

    /// <summary>
    /// Highly critical or privileged data strictly limited to Tenant Administrators.
    /// </summary>
    Restricted = 4
}
