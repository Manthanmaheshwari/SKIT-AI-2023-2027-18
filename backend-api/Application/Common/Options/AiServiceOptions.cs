namespace EnterpriseApi.Application.Common.Options;

/// <summary>
/// Encapsulates enterprise network, security, and resiliency configuration for inter-service communication
/// with the downstream Python FastAPI AI Microservice.
/// </summary>
public class AiServiceOptions
{
    /// <summary>
    /// Configuration section key inside application configuration files.
    /// </summary>
    public const string SectionName = "Services:AiService";

    /// <summary>
    /// Gets or sets the base URI for the Python FastAPI AI inference engine.
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:8000";

    /// <summary>
    /// Gets or sets the shared internal service authentication key or token.
    /// </summary>
    public string ApiKey { get; set; } = "EnterpriseAiServiceInternalSharedSecret2026!";

    /// <summary>
    /// Gets or sets the HTTP request timeout in seconds before client cancellation is triggered.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Gets or sets the maximum concurrent HTTP connections allowed per server endpoint in SocketsHttpHandler.
    /// </summary>
    public int MaxConnectionsPerServer { get; set; } = 200;

    /// <summary>
    /// Gets or sets how long connections in the pool remain active before undergoing DNS refresh (in minutes).
    /// </summary>
    public int PooledConnectionLifetimeMinutes { get; set; } = 15;

    /// <summary>
    /// Gets or sets how long idle connections remain open in the pool before closure (in minutes).
    /// </summary>
    public int PooledConnectionIdleTimeoutMinutes { get; set; } = 2;

    /// <summary>
    /// Gets or sets the maximum retry attempts for transient HTTP failure status codes.
    /// </summary>
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>
    /// Gets or sets the baseline delay in milliseconds used by the exponential backoff algorithm.
    /// </summary>
    public int BaseDelayMilliseconds { get; set; } = 200;

    /// <summary>
    /// Gets or sets the ceiling delay in milliseconds for exponential backoff retries.
    /// </summary>
    public int MaxDelayMilliseconds { get; set; } = 3000;

    /// <summary>
    /// Gets or sets the number of consecutive transient failures required to trip the circuit breaker into Open state.
    /// </summary>
    public int CircuitBreakerFailureThreshold { get; set; } = 5;

    /// <summary>
    /// Gets or sets the duration in seconds the circuit breaker remains Open before transitioning to Half-Open probe state.
    /// </summary>
    public int CircuitBreakerBreakDurationSeconds { get; set; } = 15;

    /// <summary>
    /// Gets or sets the client service identifier transmitted in the X-Client-Service header.
    /// </summary>
    public string ClientServiceName { get; set; } = "EnterpriseApi-Gateway";
}
