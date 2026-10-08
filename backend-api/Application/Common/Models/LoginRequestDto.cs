using System.ComponentModel.DataAnnotations;

namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Data transfer object carrying credentials for user authentication.
/// </summary>
public class LoginRequestDto
{
    /// <summary>
    /// Gets or sets the user's primary email address.
    /// </summary>
    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "A valid email address must be provided.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the plain-text password for account authentication.
    /// </summary>
    [Required(ErrorMessage = "Password is required.")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters in length.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional tenant identifier slug when tenant context is provided in the payload.
    /// </summary>
    public string? TenantIdentifier { get; set; }
}
