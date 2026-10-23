using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Diagnostic status model for the inter-service HTTP circuit breaker.
/// </summary>
public class AiServiceCircuitBreakerStatusDto
{
    /// <summary>
    /// Gets or sets the circuit identifier name.
    /// </summary>
    [JsonPropertyName("circuit")]
    public string Circuit { get; set; } = "ai-service-breaker";

    /// <summary>
    /// Gets or sets the circuit state ("Closed", "Open", "HalfOpen").
    /// </summary>
    [JsonPropertyName("state")]
    public string State { get; set; } = "Closed";

    /// <summary>
    /// Gets or sets the count of consecutive transient failures observed.
    /// </summary>
    [JsonPropertyName("consecutiveFailures")]
    public int ConsecutiveFailures { get; set; }

    /// <summary>
    /// Gets or sets the failure count threshold required to trip the circuit.
    /// </summary>
    [JsonPropertyName("failureThreshold")]
    public int FailureThreshold { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when the most recent failure occurred.
    /// </summary>
    [JsonPropertyName("lastFailureTimeUtc")]
    public DateTime? LastFailureTimeUtc { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when the state machine last transitioned.
    /// </summary>
    [JsonPropertyName("lastStateTransitionUtc")]
    public DateTime LastStateTransitionUtc { get; set; }

    /// <summary>
    /// Gets or sets the estimated remaining seconds of break duration before half-open probe if Open.
    /// </summary>
    [JsonPropertyName("breakDurationRemainingSeconds")]
    public double BreakDurationRemainingSeconds { get; set; }
}
