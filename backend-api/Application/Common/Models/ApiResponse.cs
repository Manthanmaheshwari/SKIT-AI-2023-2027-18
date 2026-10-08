namespace EnterpriseApi.Application.Common.Models;

/// <summary>
/// Represents a standardized enterprise envelope response wrapper for all API endpoints.
/// </summary>
/// <typeparam name="T">The payload data type.</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Gets or sets a value indicating whether the request completed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the human-readable summary message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the primary payload data.
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Gets or sets any error messages encountered during request execution.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Gets or sets the UTC timestamp when the response was generated.
    /// </summary>
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Factory helper to generate a successful response envelope.
    /// </summary>
    /// <param name="data">The output payload data.</param>
    /// <param name="message">An optional confirmation message.</param>
    /// <returns>A structured success response envelope.</returns>
    public static ApiResponse<T> SuccessResult(T data, string message = "Operation completed successfully.")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            TimestampUtc = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Factory helper to generate a failed response envelope.
    /// </summary>
    /// <param name="message">The failure explanation.</param>
    /// <param name="errors">Detailed error messages or validation failures.</param>
    /// <returns>A structured error response envelope.</returns>
    public static ApiResponse<T> FailureResult(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors ?? new List<string>(),
            TimestampUtc = DateTime.UtcNow
        };
    }
}
