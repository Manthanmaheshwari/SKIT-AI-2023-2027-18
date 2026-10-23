using EnterpriseApi.Application.Common.Models.AiService;

namespace EnterpriseApi.Application.Common.Interfaces;

/// <summary>
/// Provides strongly-typed, secure inter-service communication and document synchronization
/// with the Python FastAPI AI inference and retrieval microservice.
/// </summary>
public interface IAiServiceClient
{
    /// <summary>
    /// Executes a health check probe against the Python AI microservice.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Health state and index statistics.</returns>
    Task<AiServiceHealthDto> CheckHealthAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Dispatches a document ingestion payload to chunk, embed in ChromaDB, and index in BM25.
    /// </summary>
    /// <param name="request">The document ingestion details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Confirmation containing chunk and vector metrics.</returns>
    Task<DocumentIngestionResponseDto> IngestDocumentAsync(
        DocumentIngestionRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes hybrid retrieval combining dense vector similarity with sparse BM25 keyword matching via RRF.
    /// </summary>
    /// <param name="request">The hybrid search parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Ranked list of fused document candidate snippets.</returns>
    Task<HybridSearchResponseDto> SearchHybridAsync(
        HybridSearchRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes an end-to-end grounded RAG inquiry with dynamic LLM answer generation and citation anchoring.
    /// </summary>
    /// <param name="request">The RAG query parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Synthesized answer grounded by citations and fused document candidates.</returns>
    Task<RagQueryResponseDto> QueryRagAsync(
        RagQueryRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Synchronizes a domain document from the .NET backend to the Python AI microservice,
    /// automatically injecting the active multi-tenant context and standard metadata.
    /// </summary>
    /// <param name="documentId">The unique document identifier.</param>
    /// <param name="title">The document title.</param>
    /// <param name="content">The raw document body.</param>
    /// <param name="metadata">Optional metadata attributes.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Ingestion confirmation details.</returns>
    Task<DocumentIngestionResponseDto> SynchronizeDocumentAsync(
        Guid documentId,
        string title,
        string content,
        IDictionary<string, object>? metadata = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Synchronizes a batch of domain documents concurrently with throttled degree of parallelism.
    /// </summary>
    /// <param name="documents">Collection of documents to synchronize.</param>
    /// <param name="maxDegreeOfParallelism">Maximum concurrent synchronization requests.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if all documents synchronized successfully; otherwise false.</returns>
    Task<bool> SynchronizeBatchDocumentsAsync(
        IEnumerable<(Guid DocumentId, string Title, string Content, IDictionary<string, object>? Metadata)> documents,
        int maxDegreeOfParallelism = 4,
        CancellationToken cancellationToken = default);
}
