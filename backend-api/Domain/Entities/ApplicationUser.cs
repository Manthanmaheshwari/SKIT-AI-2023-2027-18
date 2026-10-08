using Microsoft.AspNetCore.Identity;

namespace EnterpriseApi.Domain.Entities;

/// <summary>
/// Represents an authenticated enterprise user within the ASP.NET Identity system.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    /// <summary>
    /// Gets or sets the full legal or display name of the user.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique tenant identifier to which this user belongs.
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Gets or sets the navigation property to the associated tenant organization.
    /// </summary>
    public Tenant? Tenant { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user account is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the UTC timestamp when the user account was provisioned.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the collection of active and expired refresh tokens belonging to the user.
    /// </summary>
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationUser"/> class.
    /// </summary>
    public ApplicationUser()
    {
        Id = Guid.NewGuid();
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationUser"/> class with user details.
    /// </summary>
    /// <param name="userName">The unique user login name.</param>
    /// <param name="email">The primary email address.</param>
    /// <param name="fullName">The full name of the user.</param>
    /// <param name="tenantId">The unique tenant identifier.</param>
    public ApplicationUser(string userName, string email, string fullName, Guid tenantId) : this()
    {
        UserName = userName;
        Email = email;
        FullName = fullName;
        TenantId = tenantId;
        CreatedAtUtc = DateTime.UtcNow;
        IsActive = true;
    }
}
