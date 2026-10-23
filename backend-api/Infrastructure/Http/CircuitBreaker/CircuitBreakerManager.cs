using EnterpriseApi.Application.Common.Exceptions;
using EnterpriseApi.Application.Common.Models.AiService;
using EnterpriseApi.Application.Common.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Infrastructure.Http.CircuitBreaker;

/// <summary>
/// Thread-safe circuit breaker state machine for inter-service communication with the AI microservice.
/// </summary>
public class CircuitBreakerManager : ICircuitBreakerManager
{
    private readonly object _syncRoot = new();
    private readonly ILogger<CircuitBreakerManager> _logger;
    private readonly int _failureThreshold;
    private readonly TimeSpan _breakDuration;

    private CircuitState _state = CircuitState.Closed;
    private int _consecutiveFailures;
    private DateTime? _lastFailureTimeUtc;
    private DateTime _lastStateTransitionUtc = DateTime.UtcNow;

    /// <summary>
    /// Gets the unique circuit name.
    /// </summary>
    public string CircuitName { get; } = "ai-service-breaker";

    private enum CircuitState
    {
        Closed,
        Open,
        HalfOpen
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="CircuitBreakerManager"/> class.
    /// </summary>
    /// <param name="options">Configured AI service options.</param>
    /// <param name="logger">Logger instance.</param>
    public CircuitBreakerManager(
        IOptions<AiServiceOptions> options,
        ILogger<CircuitBreakerManager> logger)
    {
        _logger = logger;
        var opts = options.Value;
        _failureThreshold = Math.Max(1, opts.CircuitBreakerFailureThreshold);
        _breakDuration = TimeSpan.FromSeconds(Math.Max(5, opts.CircuitBreakerBreakDurationSeconds));
    }

    /// <inheritdoc />
    public void EnsurePermitted(string endpoint)
    {
        lock (_syncRoot)
        {
            var now = DateTime.UtcNow;

            if (_state == CircuitState.Open)
            {
                var elapsed = now - _lastStateTransitionUtc;
                if (elapsed >= _breakDuration)
                {
                    _state = CircuitState.HalfOpen;
                    _lastStateTransitionUtc = now;
                    _logger.LogInformation(
                        "Circuit breaker '{Circuit}' transitioning from Open to Half-Open probe status after {Elapsed:F1}s break.",
                        CircuitName, elapsed.TotalSeconds);
                    return;
                }

                var remaining = _breakDuration - elapsed;
                _logger.LogWarning(
                    "Circuit breaker '{Circuit}' is Open. Fast-failing outbound request to endpoint '{Endpoint}'. Remaining break: {Remaining:F1}s.",
                    CircuitName, endpoint, remaining.TotalSeconds);

                throw new AiServiceCircuitBreakerException(CircuitName, remaining, endpoint);
            }
        }
    }

    /// <inheritdoc />
    public void RecordSuccess()
    {
        lock (_syncRoot)
        {
            if (_state == CircuitState.HalfOpen)
            {
                _state = CircuitState.Closed;
                _consecutiveFailures = 0;
                _lastStateTransitionUtc = DateTime.UtcNow;
                _logger.LogInformation(
                    "Circuit breaker '{Circuit}' probe request succeeded. Resetting state to Closed and clearing failure counters.",
                    CircuitName);
            }
            else if (_consecutiveFailures > 0)
            {
                _consecutiveFailures = 0;
            }
        }
    }

    /// <inheritdoc />
    public void RecordFailure(int? statusCode = null)
    {
        lock (_syncRoot)
        {
            var now = DateTime.UtcNow;
            _lastFailureTimeUtc = now;
            _consecutiveFailures++;

            if (_state == CircuitState.HalfOpen)
            {
                _state = CircuitState.Open;
                _lastStateTransitionUtc = now;
                _logger.LogWarning(
                    "Circuit breaker '{Circuit}' probe request failed (StatusCode: {StatusCode}). Tripping back to Open for {BreakDuration}s.",
                    CircuitName, statusCode?.ToString() ?? "NetworkError", _breakDuration.TotalSeconds);
            }
            else if (_state == CircuitState.Closed && _consecutiveFailures >= _failureThreshold)
            {
                _state = CircuitState.Open;
                _lastStateTransitionUtc = now;
                _logger.LogError(
                    "Circuit breaker '{Circuit}' tripped to Open state after {Failures} consecutive failures (Threshold: {Threshold}). Break duration: {BreakDuration}s.",
                    CircuitName, _consecutiveFailures, _failureThreshold, _breakDuration.TotalSeconds);
            }
        }
    }

    /// <inheritdoc />
    public void Reset()
    {
        lock (_syncRoot)
        {
            _state = CircuitState.Closed;
            _consecutiveFailures = 0;
            _lastStateTransitionUtc = DateTime.UtcNow;
            _lastFailureTimeUtc = null;
            _logger.LogInformation("Circuit breaker '{Circuit}' manually reset to Closed state.", CircuitName);
        }
    }

    /// <inheritdoc />
    public AiServiceCircuitBreakerStatusDto GetStatus()
    {
        lock (_syncRoot)
        {
            var now = DateTime.UtcNow;
            double remainingSeconds = 0;

            if (_state == CircuitState.Open)
            {
                var elapsed = now - _lastStateTransitionUtc;
                if (elapsed < _breakDuration)
                {
                    remainingSeconds = (_breakDuration - elapsed).TotalSeconds;
                }
            }

            return new AiServiceCircuitBreakerStatusDto
            {
                Circuit = CircuitName,
                State = _state.ToString(),
                ConsecutiveFailures = _consecutiveFailures,
                FailureThreshold = _failureThreshold,
                LastFailureTimeUtc = _lastFailureTimeUtc,
                LastStateTransitionUtc = _lastStateTransitionUtc,
                BreakDurationRemainingSeconds = Math.Max(0, Math.Round(remainingSeconds, 1))
            };
        }
    }
}
