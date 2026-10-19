using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Domain.Entities;
using EnterpriseApi.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseApi.Controllers;

/// <summary>
/// Manages enterprise document retrieval and operations with classification-level RBAC enforcement.
/// </summary>
[ApiController]
[Route("api/v1/documents")]
[Authorize]
[Produces("application/json")]
public class DocumentsController : ControllerBase
{
    private readonly IAuthorizationService _authorizationService;
    private readonly ICurrentTenantService _currentTenantService;
    private readonly ILogger<DocumentsController> _logger;

    // Simulated in-memory documents repository for demonstration purposes
    private static readonly List<Document> DemoDocuments = new()
    {
        new Document
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Title = "Public Company Overview",
            Content = "Overview of company quarterly mission and goals.",
            Classification = ClassificationLevel.Public,
            TenantId = Guid.Empty, // Will be aligned dynamically in demo lookup
            OwnerId = Guid.NewGuid()
        },
        new Document
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Title = "Internal Engineering Handbook",
            Content = "Coding standards, deployment procedures, and guidelines.",
            Classification = ClassificationLevel.Internal,
            TenantId = Guid.Empty,
            OwnerId = Guid.NewGuid()
        },
        new Document
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Title = "Confidential Next-Gen AI Model Architecture",
            Content = "Proprietary deep learning model weights and enterprise secrets.",
            Classification = ClassificationLevel.Confidential,
            TenantId = Guid.Empty,
            OwnerId = Guid.NewGuid()
        },
        new Document
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            Title = "Restricted Board Mergers and Acquisitions",
            Content = "Board-only executive strategy and M&A legal documents.",
            Classification = ClassificationLevel.Restricted,
            TenantId = Guid.Empty,
            OwnerId = Guid.NewGuid()
        }
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentsController"/> class.
    /// </summary>
    /// <param name="authorizationService">The framework authorization service.</param>
    /// <param name="currentTenantService">The resolved multi-tenant context service.</param>
    /// <param name="logger">The controller logger.</param>
    public DocumentsController(
        IAuthorizationService authorizationService,
        ICurrentTenantService currentTenantService,
        ILogger<DocumentsController> logger)
    {
        _authorizationService = authorizationService;
        _currentTenantService = currentTenantService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves a document by its unique identifier, strictly enforcing resource-based classification RBAC.
    /// </summary>
    /// <param name="id">The unique identifier of the requested document.</param>
    /// <returns>The document data if authorized; 403 Forbidden if the user's role lacks required clearance.</returns>
    /// <response code="200">Returns the requested document payload.</response>
    /// <response code="401">If the incoming request is unauthenticated or the JWT token is invalid.</response>
    /// <response code="403">If the user's Role claim is insufficient to access the document's classification tier.</response>
    /// <response code="404">If the document does not exist.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DocumentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DocumentDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<DocumentDto>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<DocumentDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDocumentById(Guid id)
    {
        var tenantId = _currentTenantService.TenantId ?? Guid.Empty;

        // Retrieve the document
        var document = DemoDocuments.FirstOrDefault(d => d.Id == id);
        if (document == null)
        {
            return NotFound(ApiResponse<DocumentDto>.FailureResult($"Document with ID '{id}' was not found."));
        }

        // Align tenant for the demo in-memory instance
        document.TenantId = tenantId;

        // Execute resource-based authorization evaluation against DocumentClassificationPolicy
        var authorizationResult = await _authorizationService.AuthorizeAsync(
            User,
            document,
            "DocumentClassificationPolicy");

        if (!authorizationResult.Succeeded)
        {
            _logger.LogWarning(
                "Access Denied: Subject {Subject} does not possess clearance to view {Classification} document {DocumentId}.",
                User.Identity?.Name ?? "Anonymous",
                document.Classification,
                document.Id);

            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<DocumentDto>.FailureResult(
                $"Access Denied: Your assigned role does not permit access to '{document.Classification}' tier documents."));
        }

        var dto = new DocumentDto
        {
            Id = document.Id,
            Title = document.Title,
            Content = document.Content,
            Classification = document.Classification,
            TenantId = document.TenantId,
            OwnerId = document.OwnerId,
            CreatedAtUtc = document.CreatedAtUtc
        };

        return Ok(ApiResponse<DocumentDto>.SuccessResult(dto, "Document retrieved successfully."));
    }
}
