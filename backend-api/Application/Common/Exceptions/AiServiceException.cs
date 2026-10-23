using System.Net;

namespace EnterpriseApi.Application.Common.Exceptions;

/// <summary>
/// Base exception thrown when inter-service communication with the AI microservice fails.
/// </summary>
public class AiServiceException : Exception
{
    /// <summary>
    /// Gets the HTTP status code returned by the downstream microservice, if applicable.
    /// </summary>
    public HttpStatusCode? StatusCode { get; }

    /// <summary>
    /// Gets the target endpoint route that failed.
    /// </summary>
    public string? Endpoint { get; }

    /// <summary>
    /// Gets the distributed tracing correlation identifier associated with the failed request.
    /// </summary>
    public string? CorrelationId { get; }

    /// <summary>
    /// Gets the raw error content or detail returned by the microservice.
    /// </summary>
    public string? ErrorContent { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceException"/> class.
    /// </summary>
    public AiServiceException(string message) : base(message)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceException"/> class.
    /// </summary>
    public AiServiceException(string message, Exception innerException) : base(message, innerException)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceException"/> class with detailed HTTP context.
    /// </summary>
    public AiServiceException(
        string message,
        HttpStatusCode? statusCode,
        string? endpoint = null,
        string? correlationId = null,
        string? errorContent = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
        Endpoint = endpoint;
        CorrelationId = correlationId;
        ErrorContent = errorContent;
    }
}
