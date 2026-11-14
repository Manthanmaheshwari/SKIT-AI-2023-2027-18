using EnterpriseApi.Application.Common.Exceptions;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models;
using EnterpriseApi.Application.Common.Models.AiService;
using EnterpriseApi.Application.Common.Models.Queue;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Infrastructure.Http.CircuitBreaker;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseApi.Controllers;

/// <summary>
/// Exposes secure gateway endpoints to synchronize documents and dispatch hybrid search / RAG queries
/// to the downstream Python FastAPI AI microservice, with asynchronous RabbitMQ-style background queue processing.
/// </summary>
[ApiController]
[Route("api/v1/ai")]
[Authorize]
[Produces("application/json")]
public class AiSynchronizationController : ControllerBase
{
    private readonly IAiServiceClient _aiServiceClient;
    private readonly ICircuitBreakerManager _circuitBreakerManager;
    private readonly ICurrentTenantService _currentTenantService;
    private readonly IAsyncDocumentQueuePublisher _queuePublisher;
    private readonly ILogger<AiSynchronizationController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AiSynchronizationController"/> class.
    /// </summary>
    public AiSynchronizationController(
        IAiServiceClient aiServiceClient,
        ICircuitBreakerManager circuitBreakerManager,
        ICurrentTenantService currentTenantService,
        IAsyncDocumentQueuePublisher queuePublisher,
        ILogger<AiSynchronizationController> logger)
    {
        _aiServiceClient = aiServiceClient;
        _circuitBreakerManager = circuitBreakerManager;
        _currentTenantService = currentTenantService;
        _queuePublisher = queuePublisher;
        _logger = logger;
    }

    /// <summary>
    /// Synchronizes a document to the Python AI microservice for chunking, vector embedding, and BM25 indexing.
    /// </summary>
    /// <param name="documentId">The target document GUID.</param>
    /// <param name="request">Ingestion metadata and content.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Ingestion confirmation metrics.</returns>
    /// <response code="200">Document successfully synchronized and indexed.</response>
    /// <response code="400">If the payload is invalid or malformed.</response>
    /// <response code="503">If the downstream AI microservice is experiencing transient failure or circuit is Open.</response>
    [HttpPost("sync/{documentId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DocumentIngestionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DocumentIngestionResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<DocumentIngestionResponseDto>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> SynchronizeDocument(
        Guid documentId,
        [FromBody] DocumentIngestionRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            request.DocumentId = documentId.ToString();
            var response = await _aiServiceClient.IngestDocumentAsync(request, cancellationToken);
            return Ok(ApiResponse<DocumentIngestionResponseDto>.SuccessResult(response, "Document synchronized with AI microservice successfully."));
        }
        catch (AiServiceCircuitBreakerException ex)
        {
            _logger.LogWarning(ex, "Circuit breaker prevented document synchronization for DocId {DocId}.", documentId);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<DocumentIngestionResponseDto>.FailureResult(ex.Message));
        }
        catch (AiServiceValidationException ex)
        {
            return BadRequest(ApiResponse<DocumentIngestionResponseDto>.FailureResult(ex.Message, ex.ValidationErrors.ToList()));
        }
        catch (AiServiceException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<DocumentIngestionResponseDto>.FailureResult(ex.Message));
        }
    }

    /// <summary>
    /// Executes hybrid retrieval combining dense vector similarity with sparse BM25 keyword matching via RRF.
    /// </summary>
    /// <param name="request">Search parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Ranked list of fused document candidates.</returns>
    [HttpPost("search")]
    [ProducesResponseType(typeof(ApiResponse<HybridSearchResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<HybridSearchResponseDto>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> HybridSearch(
        [FromBody] HybridSearchRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var results = await _aiServiceClient.SearchHybridAsync(request, cancellationToken);
            return Ok(ApiResponse<HybridSearchResponseDto>.SuccessResult(results, "Hybrid search completed successfully."));
        }
        catch (AiServiceCircuitBreakerException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<HybridSearchResponseDto>.FailureResult(ex.Message));
        }
        catch (AiServiceException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<HybridSearchResponseDto>.FailureResult(ex.Message));
        }
    }

    /// <summary>
    /// Submits a natural language query for end-to-end RAG synthesis with visual citations.
    /// </summary>
    /// <param name="request">RAG query parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Synthesized answer grounded in document citations.</returns>
    [HttpPost("query")]
    [ProducesResponseType(typeof(ApiResponse<RagQueryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RagQueryResponseDto>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> QueryRag(
        [FromBody] RagQueryRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _aiServiceClient.QueryRagAsync(request, cancellationToken);
            return Ok(ApiResponse<RagQueryResponseDto>.SuccessResult(response, "RAG synthesis completed successfully."));
        }
        catch (AiServiceCircuitBreakerException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<RagQueryResponseDto>.FailureResult(ex.Message));
        }
        catch (AiServiceException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<RagQueryResponseDto>.FailureResult(ex.Message));
        }
    }

    /// <summary>
    /// Probes the operational health and index status of the Python AI microservice.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Health state and index statistics.</returns>
    [HttpGet("health")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AiServiceHealthDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AiServiceHealthDto>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetAiServiceHealth(CancellationToken cancellationToken)
    {
        try
        {
            var health = await _aiServiceClient.CheckHealthAsync(cancellationToken);
            return Ok(ApiResponse<AiServiceHealthDto>.SuccessResult(health, "AI microservice is operational."));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<AiServiceHealthDto>.FailureResult($"AI microservice unreachable: {ex.Message}"));
        }
    }

    /// <summary>
    /// Inspects the active state and telemetry of the inter-service circuit breaker.
    /// </summary>
    /// <returns>Circuit breaker state telemetry.</returns>
    [HttpGet("circuit-breaker")]
    [Authorize(Roles = $"{ApplicationRoles.Admin},{ApplicationRoles.SecurityLead}")]
    [ProducesResponseType(typeof(ApiResponse<AiServiceCircuitBreakerStatusDto>), StatusCodes.Status200OK)]
    public IActionResult GetCircuitBreakerStatus()
    {
        var status = _circuitBreakerManager.GetStatus();
        return Ok(ApiResponse<AiServiceCircuitBreakerStatusDto>.SuccessResult(status, "Circuit breaker telemetry retrieved."));
    }

    /// <summary>
    /// Resets the inter-service circuit breaker to Closed state and clears transient failure counters.
    /// </summary>
    /// <returns>Reset confirmation.</returns>
    [HttpPost("circuit-breaker/reset")]
    [Authorize(Roles = ApplicationRoles.Admin)]
    [ProducesResponseType(typeof(ApiResponse<AiServiceCircuitBreakerStatusDto>), StatusCodes.Status200OK)]
    public IActionResult ResetCircuitBreaker()
    {
        _circuitBreakerManager.Reset();
        var status = _circuitBreakerManager.GetStatus();
        return Ok(ApiResponse<AiServiceCircuitBreakerStatusDto>.SuccessResult(status, "Circuit breaker reset to Closed state."));
    }

    /// <summary>
    /// Enqueues a document ingestion job into the asynchronous RabbitMQ-style background queue.
    /// Processes parsing and vector chunking without blocking the main web thread.
    /// </summary>
    /// <param name="request">Ingestion parameters with tenant_id and document_uri.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Confirmation containing the assigned JobId and Queued status.</returns>
    /// <response code="202">Job successfully accepted and placed in the background queue.</response>
    /// <response code="400">If required parameters are missing or invalid.</response>
    [HttpPost("queue/ingest")]
    [ProducesResponseType(typeof(ApiResponse<EnqueueDocumentJobResponseDto>), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ApiResponse<EnqueueDocumentJobResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> EnqueueDocumentIngestion(
        [FromBody] EnqueueDocumentJobRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DocumentUri))
        {
            return BadRequest(ApiResponse<EnqueueDocumentJobResponseDto>.FailureResult("DocumentUri is mandatory for queue ingestion."));
        }

        var tenantId = !string.IsNullOrWhiteSpace(request.TenantId)
            ? request.TenantId
            : _currentTenantService.TenantIdentifier ?? (_currentTenantService.TenantId.HasValue ? $"ten_{_currentTenantService.TenantId.Value:D}" : "skit-ai-labs");

        var job = await _queuePublisher.EnqueueAsync(
            tenantId: tenantId,
            documentUri: request.DocumentUri,
            jobId: request.JobId,
            metadata: request.Metadata,
            cancellationToken: cancellationToken);

        var responseDto = new EnqueueDocumentJobResponseDto
        {
            JobId = job.JobId,
            TenantId = job.TenantId,
            DocumentUri = job.DocumentUri,
            Status = job.Status,
            EnqueuedAtUtc = job.CreatedAtUtc
        };

        return Accepted(ApiResponse<EnqueueDocumentJobResponseDto>.SuccessResult(
            responseDto,
            "Document ingestion job queued successfully for background execution."));
    }

    /// <summary>
    /// Retrieves the real-time execution status of an asynchronous document ingestion job.
    /// Status transitions: Queued -> Parsing -> Chunking -> Indexed (or DeadLetter/Failed).
    /// </summary>
    /// <param name="jobId">The unique job identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Job execution telemetry.</returns>
    /// <response code="200">Current status record of the job.</response>
    /// <response code="404">If the job ID is unknown.</response>
    [HttpGet("queue/jobs/{jobId}")]
    [ProducesResponseType(typeof(ApiResponse<DocumentJobStatusDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DocumentJobStatusDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQueueJobStatus(
        string jobId,
        CancellationToken cancellationToken)
    {
        var job = await _queuePublisher.GetJobStatusAsync(jobId, cancellationToken);
        if (job == null)
        {
            return NotFound(ApiResponse<DocumentJobStatusDto>.FailureResult($"Job with ID '{jobId}' was not found."));
        }

        var dto = new DocumentJobStatusDto
        {
            JobId = job.JobId,
            TenantId = job.TenantId,
            DocumentUri = job.DocumentUri,
            Status = job.Status,
            RetryCount = job.RetryCount,
            MaxRetries = job.MaxRetries,
            ErrorMessage = job.ErrorMessage,
            ChunksIndexed = job.ChunksIndexed,
            ProcessingTimeMs = job.ProcessingTimeMs,
            CreatedAtUtc = job.CreatedAtUtc,
            UpdatedAtUtc = job.UpdatedAtUtc,
            Metadata = job.Metadata
        };

        return Ok(ApiResponse<DocumentJobStatusDto>.SuccessResult(dto, "Job status retrieved successfully."));
    }

    /// <summary>
    /// Retrieves aggregated queue operational metrics and throughput telemetry.
    /// </summary>
    /// <returns>Queue depth, active worker count, and job distribution.</returns>
    [HttpGet("queue/stats")]
    [ProducesResponseType(typeof(ApiResponse<QueueMetricsDto>), StatusCodes.Status200OK)]
    public IActionResult GetQueueStats()
    {
        var metrics = _queuePublisher.GetMetrics();
        return Ok(ApiResponse<QueueMetricsDto>.SuccessResult(metrics, "Queue telemetry retrieved successfully."));
    }

    /// <summary>
    /// Retrieves all jobs currently routed to the Dead-Letter Queue (DLQ).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of dead-lettered jobs.</returns>
    [HttpGet("queue/dead-letter")]
    [Authorize(Roles = $"{ApplicationRoles.Admin},{ApplicationRoles.SecurityLead}")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<DocumentJobStatusDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDeadLetterJobs(CancellationToken cancellationToken)
    {
        var deadJobs = await _queuePublisher.GetDeadLetterJobsAsync(cancellationToken);
        var dtos = deadJobs.Select(j => new DocumentJobStatusDto
        {
            JobId = j.JobId,
            TenantId = j.TenantId,
            DocumentUri = j.DocumentUri,
            Status = j.Status,
            RetryCount = j.RetryCount,
            MaxRetries = j.MaxRetries,
            ErrorMessage = j.ErrorMessage,
            ChunksIndexed = j.ChunksIndexed,
            ProcessingTimeMs = j.ProcessingTimeMs,
            CreatedAtUtc = j.CreatedAtUtc,
            UpdatedAtUtc = j.UpdatedAtUtc,
            Metadata = j.Metadata
        }).ToList();

        return Ok(ApiResponse<IReadOnlyList<DocumentJobStatusDto>>.SuccessResult(
            dtos,
            $"Retrieved {dtos.Count} dead-lettered jobs for administrative review."));
    }
}
