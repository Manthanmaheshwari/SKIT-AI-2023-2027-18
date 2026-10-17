using EnterpriseApi.Domain.Enums;

namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Data transfer object representing a secured enterprise document.
/// </summary>
public class DocumentDto
{
    /// <summary>
    /// Gets or sets the document primary identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the title of the document.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the document content payload.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the document's classification level.
    /// </summary>
    public ClassificationLevel Classification { get; set; }

    /// <summary>
    /// Gets or sets the owning tenant ID.
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Gets or sets the creator/owner user ID.
    /// </summary>
    public Guid OwnerId { get; set; }

    /// <summary>
    /// Gets or sets the UTC creation timestamp.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; }
}
