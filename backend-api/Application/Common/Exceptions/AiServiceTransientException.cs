using System.Net;

namespace EnterpriseApi.Application.Common.Exceptions;

/// <summary>
/// Thrown when a transient failure (e.g. 500, 502, 503, 504, 408, 429, or network socket disconnect)
/// is encountered while communicating with the AI microservice.
/// </summary>
public class AiServiceTransientException : AiServiceException
{
    /// <summary>
    /// Gets the recommended retry-after delay if specified by the downstream service.
    /// </summary>
    public TimeSpan? RetryAfter { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceTransientException"/> class.
    /// </summary>
    public AiServiceTransientException(
        string message,
        HttpStatusCode? statusCode,
        string? endpoint = null,
        string? correlationId = null,
        string? errorContent = null,
        TimeSpan? retryAfter = null,
        Exception? innerException = null)
        : base(message, statusCode, endpoint, correlationId, errorContent, innerException)
    {
        RetryAfter = retryAfter;
    }
}
