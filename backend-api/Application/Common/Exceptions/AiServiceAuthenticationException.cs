using System.Net;

namespace EnterpriseApi.Application.Common.Exceptions;

/// <summary>
/// Thrown when inter-service authentication or tenant clearance fails (HTTP 401 Unauthorized or HTTP 403 Forbidden).
/// </summary>
public class AiServiceAuthenticationException : AiServiceException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceAuthenticationException"/> class.
    /// </summary>
    public AiServiceAuthenticationException(
        string message,
        HttpStatusCode statusCode,
        string? endpoint = null,
        string? correlationId = null,
        string? errorContent = null)
        : base(message, statusCode, endpoint, correlationId, errorContent)
    {
    }
}
