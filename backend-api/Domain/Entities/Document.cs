using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Domain.Enums;

namespace EnterpriseApi.Domain.Entities;

/// <summary>
/// Represents an enterprise document entity subject to classification-based access control policies.
/// </summary>
public class Document : ISecuredDocument
{
    /// <summary>
    /// Gets or sets the unique primary key of the document.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the title of the document.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the descriptive or raw textual content of the document.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the classification tier determining user clearance level requirements.
    /// </summary>
    public ClassificationLevel Classification { get; set; } = ClassificationLevel.Internal;

    /// <summary>
    /// Gets or sets the tenant identifier for strict multi-tenant boundary isolation.
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Gets or sets the unique user ID of the creator/author.
    /// </summary>
    public Guid OwnerId { get; set; }

    /// <summary>
    /// Gets or sets the UTC timestamp when the document was initially created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the UTC timestamp when the document was last modified.
    /// </summary>
    public DateTime? LastModifiedAtUtc { get; set; }
}
