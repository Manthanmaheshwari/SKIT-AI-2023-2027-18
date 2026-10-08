using System.Security.Claims;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EnterpriseApi.Controllers;

/// <summary>
/// Exposes authentication, registration, token refresh, and session revocation endpoints for tenant principals.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthController"/> class.
    /// </summary>
    /// <param name="authService">The enterprise authentication service.</param>
    /// <param name="logger">The controller logger.</param>
    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a tenant user against ASP.NET Identity credentials.
    /// </summary>
    /// <param name="request">The login request model containing email, password, and optional tenant slug.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A signed multi-tenant JWT access token and refresh token pair upon successful authentication.</returns>
    /// <response code="200">Returns the newly generated access and refresh token tokens.</response>
    /// <response code="400">If the request payload fails model validation.</response>
    /// <response code="401">If the credentials or tenant boundary are invalid.</response>
    /// <response code="429">If the client exceeds the configured rate limiting threshold.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimiter")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<AuthResponseDto>.FailureResult(
                "Request validation failed.",
                ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()));
        }

        var result = await _authService.LoginAsync(request, cancellationToken);
        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Registers a new user account under an organizational tenant with designated roles.
    /// </summary>
    /// <param name="request">The registration request details including tenant identifier and user information.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A response indicating account provisioning status along with issued access tokens.</returns>
    /// <response code="200">If the account was successfully provisioned.</response>
    /// <response code="400">If validation fails or user already exists.</response>
    /// <response code="429">If registration rate limit is exceeded.</response>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimiter")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<AuthResponseDto>.FailureResult(
                "Request validation failed.",
                ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()));
        }

        var result = await _authService.RegisterAsync(request, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Refreshes an expired JWT access token using a valid, active refresh token.
    /// </summary>
    /// <param name="request">The expired access token and valid refresh token pair.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A renewed JWT token and rotated refresh token.</returns>
    /// <response code="200">Tokens refreshed successfully.</response>
    /// <response code="400">If token format is invalid or token pair validation fails.</response>
    /// <response code="401">If the refresh token has expired or been revoked.</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimiter")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<AuthResponseDto>.FailureResult(
                "Request validation failed.",
                ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()));
        }

        var result = await _authService.RefreshTokenAsync(request, cancellationToken);
        if (!result.Success)
        {
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Revokes an active refresh token to invalidate a client session.
    /// </summary>
    /// <param name="refreshToken">The opaque refresh token string to revoke.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>Confirmation of token revocation.</returns>
    /// <response code="200">The refresh token was revoked.</response>
    /// <response code="400">If the refresh token was missing or not found.</response>
    [HttpPost("revoke")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Revoke([FromBody] string refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return BadRequest(ApiResponse<bool>.FailureResult("Refresh token parameter must not be empty."));
        }

        var result = await _authService.RevokeTokenAsync(refreshToken, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieves current principal context, verified tenant membership, and granted roles.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>The authenticated user profile and tenant details.</returns>
    /// <response code="200">Returns user profile information.</response>
    /// <response code="401">If the request lacks a valid authentication token.</response>
    /// <response code="404">If the user account could not be found.</response>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserInfoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(ApiResponse<UserInfoDto>.FailureResult("Unauthorized: Valid user identifier claim not found."));
        }

        var result = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
