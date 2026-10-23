using System.Net;

namespace EnterpriseApi.Application.Common.Exceptions;

/// <summary>
/// Thrown when the Python AI microservice returns client validation errors (HTTP 400 Bad Request or HTTP 422 Unprocessable Entity).
/// </summary>
public class AiServiceValidationException : AiServiceException
{
    /// <summary>
    /// Gets the list of specific field validation errors extracted from the FastAPI response payload.
    /// </summary>
    public IReadOnlyList<string> ValidationErrors { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceValidationException"/> class.
    /// </summary>
    public AiServiceValidationException(
        string message,
        HttpStatusCode statusCode,
        string? endpoint = null,
        string? correlationId = null,
        string? errorContent = null,
        IEnumerable<string>? validationErrors = null)
        : base(message, statusCode, endpoint, correlationId, errorContent)
    {
        ValidationErrors = validationErrors?.ToList() ?? new List<string>();
    }
}
