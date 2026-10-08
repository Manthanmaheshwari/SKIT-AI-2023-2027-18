using System.ComponentModel.DataAnnotations;

namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Data transfer object carrying required information to provision a new user within a tenant.
/// </summary>
public class RegisterRequestDto
{
    /// <summary>
    /// Gets or sets the full name of the user being registered.
    /// </summary>
    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 150 characters.")]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the corporate email address of the user.
    /// </summary>
    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "A valid corporate email address is required.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the secure password for the new user account.
    /// </summary>
    [Required(ErrorMessage = "Password is required.")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters in length.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the organizational tenant identifier under which the user is registered.
    /// </summary>
    [Required(ErrorMessage = "Tenant identifier is required.")]
    public string TenantIdentifier { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional list of application roles (e.g. Admin, Researcher) to grant.
    /// </summary>
    public List<string> Roles { get; set; } = new();
}
