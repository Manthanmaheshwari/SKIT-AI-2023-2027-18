using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace EnterpriseApi.Middleware;

/// <summary>
/// Intercepts unhandled exceptions globally and serializes standard RFC 7807 problem details error responses.
/// </summary>
public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="GlobalExceptionHandlingMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware delegate in the execution pipeline.</param>
    /// <param name="logger">The logger for recording unhandled exceptions.</param>
    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> _logger)
    {
        _next = next;
        this._logger = _logger;
    }

    /// <summary>
    /// Executes the middleware for processing incoming HTTP requests.
    /// </summary>
    /// <param name="context">The active HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred during request execution on path: {Path}", context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Serializes an RFC 7807 problem details response for an unhandled exception.
    /// </summary>
    /// <param name="context">The current HTTP context.</param>
    /// <param name="exception">The caught exception instance.</param>
    /// <returns>A task representing the response write operation.</returns>
    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An internal server error occurred while processing the request.",
            Detail = "An unexpected error occurred. Please contact system administrators with the trace identifier.",
            Instance = context.Request.Path,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1"
        };

        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        var responsePayload = JsonSerializer.Serialize(problemDetails);
        return context.Response.WriteAsync(responsePayload);
    }
}
