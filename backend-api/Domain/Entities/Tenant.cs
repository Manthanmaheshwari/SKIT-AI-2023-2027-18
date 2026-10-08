namespace EnterpriseApi.Domain.Entities;

/// <summary>
/// Represents a tenant organization within the multi-tenant architecture.
/// </summary>
public class Tenant
{
    /// <summary>
    /// Gets or sets the unique primary key for the tenant.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the unique URL-friendly or subdomain identifier for the tenant.
    /// </summary>
    public string Identifier { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display name of the tenant organization.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the tenant is actively authorized to access platform services.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the UTC timestamp when the tenant record was initialized.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the collection of users associated with this tenant.
    /// </summary>
    public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();

    /// <summary>
    /// Initializes a new instance of the <see cref="Tenant"/> class.
    /// </summary>
    public Tenant()
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Tenant"/> class with specific parameters.
    /// </summary>
    /// <param name="identifier">The unique tenant slug identifier.</param>
    /// <param name="name">The organizational name of the tenant.</param>
    public Tenant(string identifier, string name)
    {
        Id = Guid.NewGuid();
        Identifier = identifier;
        Name = name;
        IsActive = true;
        CreatedAtUtc = DateTime.UtcNow;
    }
}
