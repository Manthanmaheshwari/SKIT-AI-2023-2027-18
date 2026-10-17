using EnterpriseApi.Domain.Enums;

namespace EnterpriseApi.Application.Common.Interfaces;

/// <summary>
/// Contract for resources that enforce classification-based and tenant-isolated authorization policies.
/// </summary>
public interface ISecuredDocument
{
    /// <summary>
    /// Gets the unique identifier of the secured document.
    /// </summary>
    Guid Id { get; }

    /// <summary>
    /// Gets the title or identifier of the document.
    /// </summary>
    string Title { get; }

    /// <summary>
    /// Gets the data sensitivity classification tier of the document.
    /// </summary>
    ClassificationLevel Classification { get; }

    /// <summary>
    /// Gets the tenant identifier that owns the document.
    /// </summary>
    Guid TenantId { get; }

    /// <summary>
    /// Gets the user identifier of the document author/owner.
    /// </summary>
    Guid OwnerId { get; }
}
