using EnterpriseApi.Application.Common.Models;

namespace EnterpriseApi.Application.Common.Interfaces;

/// <summary>
/// Defines the contract for enterprise authentication, multi-tenant JWT generation, and token lifecycle management.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Authenticates a tenant user against ASP.NET Identity and generates signed multi-tenant JWT and refresh tokens.
    /// </summary>
    /// <param name="request">The login credentials and optional tenant slug payload.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing authentication tokens and tenant claims.</returns>
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Provisions a new user under a validated tenant, assigning specified enterprise roles.
    /// </summary>
    /// <param name="request">The user registration payload including tenant slug and initial roles.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing the issued tokens and registration details.</returns>
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an existing refresh token pair and issues a renewed JWT access token and rotated refresh token.
    /// </summary>
    /// <param name="request">The expired access token and valid refresh token pair.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing renewed authentication tokens.</returns>
    Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Revokes an existing refresh token, invalidating future renewal requests with that token.
    /// </summary>
    /// <param name="refreshToken">The opaque refresh token string to revoke.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response indicating whether revocation succeeded.</returns>
    Task<ApiResponse<bool>> RevokeTokenAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves user account details, current tenant association, and granted roles for the specified subject.
    /// </summary>
    /// <param name="userId">The unique identifier of the user.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing current user profile and tenant information.</returns>
    Task<ApiResponse<UserInfoDto>> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
