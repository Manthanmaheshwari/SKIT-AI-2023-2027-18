using System.ComponentModel.DataAnnotations;

namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Data transfer object carrying the access token and refresh token pair for session renewal.
/// </summary>
public class RefreshTokenRequestDto
{
    /// <summary>
    /// Gets or sets the expired or current JWT access token.
    /// </summary>
    [Required(ErrorMessage = "Expired access token is required.")]
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the valid refresh token string.
    /// </summary>
    [Required(ErrorMessage = "Refresh token is required.")]
    public string RefreshToken { get; set; } = string.Empty;
}
