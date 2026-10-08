namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Contains authentication tokens and principal context returned upon successful login or token renewal.
/// </summary>
public class AuthResponseDto
{
    /// <summary>
    /// Gets or sets the digitally signed JSON Web Token (JWT) access token.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the opaque refresh token used to obtain renewed access tokens.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the UTC timestamp when the access token ceases to be valid.
    /// </summary>
    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>
    /// Gets or sets the unique tenant identifier embedded within the token claims.
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Gets or sets the tenant slug or identifier.
    /// </summary>
    public string TenantIdentifier { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the authenticated user's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the authenticated user's full name.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the list of roles assigned to the user within their tenant context.
    /// </summary>
    public List<string> Roles { get; set; } = new();
}
