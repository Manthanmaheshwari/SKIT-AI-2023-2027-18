using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseApi.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core database context configured for ASP.NET Identity and multi-tenant schema partitioning.
/// </summary>
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    private readonly ICurrentTenantService? _currentTenantService;

    /// <summary>
    /// Gets or sets the database set of tenant organizations.
    /// </summary>
    public DbSet<Tenant> Tenants => Set<Tenant>();

    /// <summary>
    /// Gets or sets the database set of issued user refresh tokens.
    /// </summary>
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationDbContext"/> class with context options.
    /// </summary>
    /// <param name="options">The options to be used by a <see cref="DbContext"/>.</param>
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationDbContext"/> class with context options and tenant provider.
    /// </summary>
    /// <param name="options">The options to be used by a <see cref="DbContext"/>.</param>
    /// <param name="currentTenantService">Service to resolve the current active tenant.</param>
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentTenantService currentTenantService) : base(options)
    {
        _currentTenantService = currentTenantService;
    }

    /// <summary>
    /// Configures the schema, relationships, and multi-tenant global query filters.
    /// </summary>
    /// <param name="builder">The builder being used to construct the model for this context.</param>
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Customize ASP.NET Identity table names for enterprise database schema
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("Users", "identity");
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.TenantId).IsRequired();

            entity.HasOne(u => u.Tenant)
                  .WithMany(t => t.Users)
                  .HasForeignKey(u => u.TenantId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(u => new { u.TenantId, u.NormalizedEmail }).HasDatabaseName("IX_Users_TenantId_NormalizedEmail");
        });

        builder.Entity<ApplicationRole>(entity =>
        {
            entity.ToTable("Roles", "identity");
            entity.Property(r => r.Description).HasMaxLength(256);
        });

        builder.Entity<IdentityUserRole<Guid>>(entity => entity.ToTable("UserRoles", "identity"));
        builder.Entity<IdentityUserClaim<Guid>>(entity => entity.ToTable("UserClaims", "identity"));
        builder.Entity<IdentityUserLogin<Guid>>(entity => entity.ToTable("UserLogins", "identity"));
        builder.Entity<IdentityRoleClaim<Guid>>(entity => entity.ToTable("RoleClaims", "identity"));
        builder.Entity<IdentityUserToken<Guid>>(entity => entity.ToTable("UserTokens", "identity"));

        // Tenant table configuration
        builder.Entity<Tenant>(entity =>
        {
            entity.ToTable("Tenants", "tenant");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Identifier).HasMaxLength(64).IsRequired();
            entity.Property(t => t.Name).HasMaxLength(128).IsRequired();
            entity.HasIndex(t => t.Identifier).IsUnique().HasDatabaseName("IX_Tenants_Identifier_Unique");
        });

        // Refresh token table configuration
        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens", "identity");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Token).HasMaxLength(256).IsRequired();
            entity.Property(r => r.JwtId).HasMaxLength(128).IsRequired();
            entity.HasIndex(r => r.Token).IsUnique().HasDatabaseName("IX_RefreshTokens_Token_Unique");

            entity.HasOne(r => r.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Global query filter for logical tenant isolation when tenant context is resolved
        if (_currentTenantService != null)
        {
            builder.Entity<ApplicationUser>()
                   .HasQueryFilter(u => !_currentTenantService.TenantId.HasValue || u.TenantId == _currentTenantService.TenantId.Value);
        }
    }
}
