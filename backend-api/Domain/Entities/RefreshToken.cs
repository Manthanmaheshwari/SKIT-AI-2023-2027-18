namespace EnterpriseApi.Domain.Entities;

/// <summary>
/// Represents a cryptographically secure refresh token for maintaining user sessions without credential re-entry.
/// </summary>
public class RefreshToken
{
    /// <summary>
    /// Gets or sets the primary key identifier of the refresh token.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the opaque token string presented by the client during token refreshment.
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique identifier (JTI) of the paired JWT access token.
    /// </summary>
    public string JwtId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the token has been explicitly revoked or invalidated.
    /// </summary>
    public bool IsRevoked { get; set; }

    /// <summary>
    /// Gets or sets the UTC timestamp when the refresh token expires.
    /// </summary>
    public DateTime ExpiryDateUtc { get; set; }

    /// <summary>
    /// Gets or sets the UTC timestamp when the token was created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the identifier of the associated user.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the navigation reference to the owning user.
    /// </summary>
    public ApplicationUser? User { get; set; }

    /// <summary>
    /// Determines whether the refresh token is currently active and eligible for renewal.
    /// </summary>
    /// <returns>True if the token is not revoked and not expired; otherwise, false.</returns>
    public bool IsActive()
    {
        return !IsRevoked && DateTime.UtcNow < ExpiryDateUtc;
    }
}
