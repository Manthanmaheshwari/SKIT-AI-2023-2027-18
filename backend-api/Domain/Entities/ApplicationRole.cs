using Microsoft.AspNetCore.Identity;

namespace EnterpriseApi.Domain.Entities;

/// <summary>
/// Represents a security role within the multi-tenant ASP.NET Identity architecture.
/// </summary>
public class ApplicationRole : IdentityRole<Guid>
{
    /// <summary>
    /// Gets or sets the functional description of the role responsibilities.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationRole"/> class.
    /// </summary>
    public ApplicationRole()
    {
        Id = Guid.NewGuid();
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationRole"/> class with a specified role name.
    /// </summary>
    /// <param name="roleName">The name of the security role.</param>
    /// <param name="description">The descriptive explanation of the role permissions.</param>
    public ApplicationRole(string roleName, string description = "") : this()
    {
        Name = roleName;
        NormalizedName = roleName.ToUpperInvariant();
        Description = description;
    }
}
