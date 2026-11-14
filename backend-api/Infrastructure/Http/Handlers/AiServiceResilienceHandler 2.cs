using System.Net;
using EnterpriseApi.Application.Common.Exceptions;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Infrastructure.Http.CircuitBreaker;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Infrastructure.Http.Handlers;

/// <summary>
/// Production-grade delegating handler providing fault tolerance, exponential backoff with full jitter,
/// and circuit breaker protection for outbound communication with the Python AI microservice.
/// </summary>
public class AiServiceResilienceHandler : DelegatingHandler
{
    private readonly ICircuitBreakerManager _circuitBreakerManager;
    private readonly AiServiceOptions _options;
    private readonly ILogger<AiServiceResilienceHandler> _logger;

    private static readonly HashSet<HttpStatusCode> TransientStatusCodes = new()
    {
        HttpStatusCode.InternalServerError,      // 500
        HttpStatusCode.BadGateway,                // 502
        HttpStatusCode.ServiceUnavailable,       // 503
        HttpStatusCode.GatewayTimeout,           // 504
        HttpStatusCode.RequestTimeout,           // 408
        HttpStatusCode.TooManyRequests           // 429
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="AiServiceResilienceHandler"/> class.
    /// </summary>
    public AiServiceResilienceHandler(
        ICircuitBreakerManager circuitBreakerManager,
        IOptions<AiServiceOptions> options,
        ILogger<AiServiceResilienceHandler> logger)
    {
        _circuitBreakerManager = circuitBreakerManager;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var endpoint = request.RequestUri?.PathAndQuery ?? request.RequestUri?.ToString() ?? "Unknown";

        // 1. Circuit breaker gatekeeping (fail-fast if Open)
        _circuitBreakerManager.EnsurePermitted(endpoint);

        var maxAttempts = Math.Max(1, _options.MaxRetryAttempts + 1);
        var baseDelayMs = Math.Max(50, _options.BaseDelayMilliseconds);
        var maxDelayMs = Math.Max(baseDelayMs, _options.MaxDelayMilliseconds);

        HttpResponseMessage? response = null;
        // Buffer request content in memory upfront so retries can clone and replay payload without stream exhaustion
        if (request.Content != null)
        {
            await request.Content.LoadIntoBufferAsync();
        }

        Exception? lastException = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                // In .NET HttpClient, sending the same HttpRequestMessage across multiple retries
                // can fail if stream contents are consumed. Clone request if retrying.
                var requestToSend = attempt == 1 ? request : await CloneHttpRequestMessageAsync(request);

                response = await base.SendAsync(requestToSend, cancellationToken);

                // Check if response returned a transient status code
                if (!TransientStatusCodes.Contains(response.StatusCode))
                {
                    // Non-transient response (success, 400, 401, 403, 404, etc.)
                    _circuitBreakerManager.RecordSuccess();
                    return response;
                }

                // Transient failure encountered
                if (attempt < maxAttempts)
                {
                    var delay = CalculateRetryDelay(attempt, response, baseDelayMs, maxDelayMs);
                    _logger.LogWarning(
                        "Transient HTTP failure {StatusCode} from {Endpoint}. Retry attempt {Attempt} of {MaxRetries} after {DelayMs}ms delay.",
                        (int)response.StatusCode, endpoint, attempt, _options.MaxRetryAttempts, delay.TotalMilliseconds);

                    response.Dispose();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }
                else
                {
                    // Exhausted all retry attempts
                    _logger.LogError(
                        "Exhausted all {MaxRetries} retry attempts for {Endpoint}. Last status code: {StatusCode}.",
                        _options.MaxRetryAttempts, endpoint, (int)response.StatusCode);

                    _circuitBreakerManager.RecordFailure((int)response.StatusCode);
                    return response;
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Upstream caller cancellation requested; propagate without tripping breaker
                throw;
            }
            catch (Exception ex) when (IsTransientException(ex))
            {
                lastException = ex;

                if (attempt < maxAttempts)
                {
                    var delay = CalculateExponentialJitterDelay(attempt, baseDelayMs, maxDelayMs);
                    _logger.LogWarning(
                        ex,
                        "Transient exception while connecting to {Endpoint}: '{Message}'. Retry attempt {Attempt} of {MaxRetries} after {DelayMs}ms delay.",
                        endpoint, ex.Message, attempt, _options.MaxRetryAttempts, delay.TotalMilliseconds);

                    await Task.Delay(delay, cancellationToken);
                }
                else
                {
                    _logger.LogError(
                        ex,
                        "Exhausted all {MaxRetries} retry attempts for {Endpoint} due to exception: '{Message}'. Tripping circuit breaker.",
                        _options.MaxRetryAttempts, endpoint, ex.Message);

                    _circuitBreakerManager.RecordFailure();
                    throw new AiServiceTransientException(
                        $"Failed to communicate with AI microservice at '{endpoint}' after {_options.MaxRetryAttempts} retries.",
                        HttpStatusCode.ServiceUnavailable,
                        endpoint,
                        innerException: ex);
                }
            }
        }

        if (response != null)
        {
            return response;
        }

        throw new AiServiceTransientException(
            $"Communication failed with '{endpoint}' after {_options.MaxRetryAttempts} attempts.",
            HttpStatusCode.ServiceUnavailable,
            endpoint,
            innerException: lastException);
    }

    private static bool IsTransientException(Exception ex)
    {
        return ex is HttpRequestException ||
               ex is TimeoutException ||
               (ex is OperationCanceledException && !ex.Data.Contains("CallerCancelled"));
    }

    private static TimeSpan CalculateRetryDelay(
        int attempt,
        HttpResponseMessage response,
        int baseDelayMs,
        int maxDelayMs)
    {
        // 1. Honor Retry-After header if provided by server (e.g. 429 Too Many Requests)
        if (response.Headers.RetryAfter != null)
        {
            if (response.Headers.RetryAfter.Delta.HasValue)
            {
                return response.Headers.RetryAfter.Delta.Value;
            }

            if (response.Headers.RetryAfter.Date.HasValue)
            {
                var diff = response.Headers.RetryAfter.Date.Value - DateTimeOffset.UtcNow;
                if (diff > TimeSpan.Zero)
                {
                    return diff;
                }
            }
        }

        // 2. Fallback to exponential backoff with full jitter
        return CalculateExponentialJitterDelay(attempt, baseDelayMs, maxDelayMs);
    }

    private static TimeSpan CalculateExponentialJitterDelay(int attempt, int baseDelayMs, int maxDelayMs)
    {
        // Full jitter formula: Random(0, Min(MaxDelay, BaseDelay * 2^(attempt - 1)))
        var exponentialCeiling = Math.Min(maxDelayMs, baseDelayMs * Math.Pow(2, attempt - 1));
        var jitteredMs = Random.Shared.Next(0, (int)exponentialCeiling);
        return TimeSpan.FromMilliseconds(jitteredMs);
    }

    private static async Task<HttpRequestMessage> CloneHttpRequestMessageAsync(HttpRequestMessage req)
    {
        var clone = new HttpRequestMessage(req.Method, req.RequestUri)
        {
            Version = req.Version
        };

        // Copy non-content headers
        foreach (var header in req.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        // Copy content and content headers
        if (req.Content != null)
        {
            var ms = new MemoryStream();
            await req.Content.CopyToAsync(ms);
            ms.Position = 0;
            clone.Content = new StreamContent(ms);

            foreach (var header in req.Content.Headers)
            {
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        // Copy options
        foreach (var opt in req.Options)
        {
            clone.Options.Set(new HttpRequestOptionsKey<object?>(opt.Key), opt.Value);
        }

        return clone;
    }
}
