namespace EnterpriseApi.Application.Common.Options;

/// <summary>
/// Encapsulates cryptographic signing and lifetime configuration for JSON Web Tokens.
/// </summary>
public class JwtOptions
{
    /// <summary>
    /// Configuration section key inside application configuration files.
    /// </summary>
    public const string SectionName = "JwtSettings";

    /// <summary>
    /// Gets or sets the symmetric security secret key used to compute HMAC SHA-256 signatures.
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the designated token issuer URI.
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the intended token audience URI.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the validity lifespan of the access token in minutes.
    /// </summary>
    public int ExpiryMinutes { get; set; } = 60;

    /// <summary>
    /// Gets or sets the validity lifespan of the refresh token in days.
    /// </summary>
    public int RefreshTokenExpiryDays { get; set; } = 7;
}
