using EnterpriseApi.Application.Common.Models.AiService;

namespace EnterpriseApi.Infrastructure.Http.CircuitBreaker;

/// <summary>
/// Defines the contract for thread-safe state machine monitoring and fault containment for downstream services.
/// </summary>
public interface ICircuitBreakerManager
{
    /// <summary>
    /// Gets the unique circuit identifier name.
    /// </summary>
    string CircuitName { get; }

    /// <summary>
    /// Verifies if the circuit breaker permits an outgoing request to proceed.
    /// Throws an <see cref="EnterpriseApi.Application.Common.Exceptions.AiServiceCircuitBreakerException"/> if the circuit is Open.
    /// </summary>
    /// <param name="endpoint">The target request endpoint URI.</param>
    void EnsurePermitted(string endpoint);

    /// <summary>
    /// Records a successfully completed HTTP operation, resetting consecutive failure counts
    /// and transitioning Half-Open probes back to Closed state.
    /// </summary>
    void RecordSuccess();

    /// <summary>
    /// Records a transient failure or connection exception, incrementing failure counters
    /// and tripping the circuit into Open state when the configured threshold is breached.
    /// </summary>
    /// <param name="statusCode">The HTTP status code or null if network failure.</param>
    void RecordFailure(int? statusCode = null);

    /// <summary>
    /// Resets the circuit breaker state to Closed and clears all failure counters.
    /// </summary>
    void Reset();

    /// <summary>
    /// Retrieves a diagnostic telemetry snapshot of the circuit breaker's active state.
    /// </summary>
    AiServiceCircuitBreakerStatusDto GetStatus();
}
