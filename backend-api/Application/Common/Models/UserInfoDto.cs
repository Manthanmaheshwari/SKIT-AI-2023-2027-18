namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Data transfer object detailing current user identity, tenant affiliation, and assigned roles.
/// </summary>
public class UserInfoDto
{
    /// <summary>
    /// Gets or sets the primary user GUID.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the user's primary corporate email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the full display name of the user.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique tenant identifier.
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Gets or sets the alphanumeric tenant identifier slug.
    /// </summary>
    public string TenantIdentifier { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display name of the tenant organization.
    /// </summary>
    public string TenantName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the collection of security roles granted to the user.
    /// </summary>
    public List<string> Roles { get; set; } = new();
}
