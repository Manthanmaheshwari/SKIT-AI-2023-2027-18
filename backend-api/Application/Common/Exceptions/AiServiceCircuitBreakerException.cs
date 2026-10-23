namespace EnterpriseApi.Application.Common.Exceptions;

/// <summary>
/// Thrown when an outgoing request is intercepted and rejected because the circuit breaker is currently in the Open state.
/// </summary>
public class AiServiceCircuitBreakerException : AiServiceException
{
    /// <summary>
    /// Gets the name of the tripped circuit breaker.
    /// </summary>
    public string CircuitName { get; }

    /// <summary>
    /// Gets the remaining duration before the circuit transitions to Half-Open probe status.
    /// </summary>
    public TimeSpan RemainingBreakDuration { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceCircuitBreakerException"/> class.
    /// </summary>
    public AiServiceCircuitBreakerException(
        string circuitName,
        TimeSpan remainingBreakDuration,
        string? endpoint = null)
        : base($"The downstream '{circuitName}' is experiencing transient failure; circuit is currently Open. Fail-fast active for {remainingBreakDuration.TotalSeconds:F1}s.",
               System.Net.HttpStatusCode.ServiceUnavailable,
               endpoint)
    {
        CircuitName = circuitName;
        RemainingBreakDuration = remainingBreakDuration;
    }
}
