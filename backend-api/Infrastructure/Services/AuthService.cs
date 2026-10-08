using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Models;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Domain.Entities;
using EnterpriseApi.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseApi.Infrastructure.Services;

/// <summary>
/// Provides enterprise authentication, multi-tenant JWT token generation, role binding, and token rotation services.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<AuthService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuthService"/> class with required dependencies.
    /// </summary>
    /// <param name="userManager">The ASP.NET Core Identity user manager.</param>
    /// <param name="roleManager">The ASP.NET Core Identity role manager.</param>
    /// <param name="dbContext">The enterprise database context.</param>
    /// <param name="jwtOptions">The configured JWT signature options.</param>
    /// <param name="logger">The structured logging service.</param>
    public AuthService(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        ApplicationDbContext dbContext,
        IOptions<JwtOptions> jwtOptions,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a tenant user against ASP.NET Identity and generates signed multi-tenant JWT and refresh tokens.
    /// </summary>
    /// <param name="request">The login credentials and tenant payload.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing authentication tokens and tenant claims.</returns>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing authentication request for email: {Email}", request.Email);

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("Authentication failed. User not found for email: {Email}", request.Email);
            return ApiResponse<AuthResponseDto>.FailureResult("Invalid email or password credentials.");
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Authentication failed. Account is deactivated for user: {UserId}", user.Id);
            return ApiResponse<AuthResponseDto>.FailureResult("User account has been deactivated. Contact your tenant administrator.");
        }

        // Verify Tenant status and boundary
        var tenant = await _dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == user.TenantId, cancellationToken);

        if (tenant == null || !tenant.IsActive)
        {
            _logger.LogWarning("Authentication failed. Tenant {TenantId} is inactive or invalid for user: {UserId}", user.TenantId, user.Id);
            return ApiResponse<AuthResponseDto>.FailureResult("Organizational tenant is inactive or not found.");
        }

        // Optional tenant slug check to prevent cross-tenant credential stuffing
        if (!string.IsNullOrWhiteSpace(request.TenantIdentifier) &&
            !string.Equals(tenant.Identifier, request.TenantIdentifier, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Authentication failed. Tenant mismatch for user: {UserId}. Expected {UserTenant}, Received {RequestedTenant}",
                user.Id, tenant.Identifier, request.TenantIdentifier);
            return ApiResponse<AuthResponseDto>.FailureResult("User is not authorized within the requested tenant domain.");
        }

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Authentication failed. Invalid password for user: {UserId}", user.Id);
            return ApiResponse<AuthResponseDto>.FailureResult("Invalid email or password credentials.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var (accessToken, jwtId, expiresAtUtc) = GenerateJwtToken(user, tenant, roles);
        var refreshToken = await GenerateAndSaveRefreshTokenAsync(user.Id, jwtId, cancellationToken);

        var responseDto = new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAtUtc = expiresAtUtc,
            TenantId = tenant.Id,
            TenantIdentifier = tenant.Identifier,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles.ToList()
        };

        _logger.LogInformation("User {UserId} authenticated successfully in tenant {TenantId}", user.Id, tenant.Id);
        return ApiResponse<AuthResponseDto>.SuccessResult(responseDto, "Authentication successful.");
    }

    /// <summary>
    /// Provisions a new user under a validated tenant, assigning specified enterprise roles.
    /// </summary>
    /// <param name="request">The user registration payload including tenant slug and initial roles.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing the issued tokens and registration details.</returns>
    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Registering user for email: {Email} under tenant: {TenantIdentifier}", request.Email, request.TenantIdentifier);

        var tenant = await _dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Identifier.ToLower() == request.TenantIdentifier.ToLower(), cancellationToken);

        if (tenant == null)
        {
            // Auto-provision initial tenant if this is a first-time initialization
            tenant = new Tenant(request.TenantIdentifier.ToLowerInvariant(), request.TenantIdentifier);
            _dbContext.Tenants.Add(tenant);
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Provisioned new tenant with ID: {TenantId}", tenant.Id);
        }
        else if (!tenant.IsActive)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Target tenant organization is inactive.");
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("User with this email already exists.");
        }

        var newUser = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            TenantId = tenant.Id,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var creationResult = await _userManager.CreateAsync(newUser, request.Password);
        if (!creationResult.Succeeded)
        {
            var errors = creationResult.Errors.Select(e => e.Description).ToList();
            return ApiResponse<AuthResponseDto>.FailureResult("User creation failed.", errors);
        }

        var targetRoles = request.Roles.Count > 0 ? request.Roles : new List<string> { RoleConstants.Researcher };
        foreach (var role in targetRoles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new ApplicationRole(role, $"System generated {role} role"));
            }
        }

        await _userManager.AddToRolesAsync(newUser, targetRoles);

        var (accessToken, jwtId, expiresAtUtc) = GenerateJwtToken(newUser, tenant, targetRoles);
        var refreshToken = await GenerateAndSaveRefreshTokenAsync(newUser.Id, jwtId, cancellationToken);

        var responseDto = new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAtUtc = expiresAtUtc,
            TenantId = tenant.Id,
            TenantIdentifier = tenant.Identifier,
            Email = newUser.Email,
            FullName = newUser.FullName,
            Roles = targetRoles.ToList()
        };

        _logger.LogInformation("User {UserId} registered successfully with tenant {TenantId}", newUser.Id, tenant.Id);
        return ApiResponse<AuthResponseDto>.SuccessResult(responseDto, "User registered successfully.");
    }

    /// <summary>
    /// Validates an existing refresh token pair and issues a renewed JWT access token and rotated refresh token.
    /// </summary>
    /// <param name="request">The expired access token and valid refresh token pair.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing renewed authentication tokens.</returns>
    public async Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Attempting token refresh operation.");

        var principal = GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Invalid access token format or signing key.");
        }

        var jti = principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
        var userIdClaim = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value
            ?? principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Invalid token claims.");
        }

        var storedRefreshToken = await _dbContext.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken, cancellationToken);

        if (storedRefreshToken == null)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token does not exist.");
        }

        if (storedRefreshToken.IsRevoked)
        {
            _logger.LogWarning("Attempted use of revoked refresh token by user: {UserId}", userId);
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token has been revoked.");
        }

        if (DateTime.UtcNow >= storedRefreshToken.ExpiryDateUtc)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token has expired. Please authenticate again.");
        }

        if (storedRefreshToken.JwtId != jti)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Refresh token does not match access token session.");
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsActive)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("User account is inactive or not found.");
        }

        var tenant = await _dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == user.TenantId, cancellationToken);
        if (tenant == null || !tenant.IsActive)
        {
            return ApiResponse<AuthResponseDto>.FailureResult("Tenant account is inactive or not found.");
        }

        // Revoke the current refresh token as part of rotation security
        storedRefreshToken.IsRevoked = true;

        var roles = await _userManager.GetRolesAsync(user);
        var (newAccessToken, newJwtId, expiresAtUtc) = GenerateJwtToken(user, tenant, roles);
        var newRefreshToken = await GenerateAndSaveRefreshTokenAsync(user.Id, newJwtId, cancellationToken);

        var responseDto = new AuthResponseDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token,
            ExpiresAtUtc = expiresAtUtc,
            TenantId = tenant.Id,
            TenantIdentifier = tenant.Identifier,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles.ToList()
        };

        _logger.LogInformation("Refreshed tokens successfully for user: {UserId}", user.Id);
        return ApiResponse<AuthResponseDto>.SuccessResult(responseDto, "Tokens refreshed successfully.");
    }

    /// <summary>
    /// Revokes an existing refresh token, invalidating future renewal requests with that token.
    /// </summary>
    /// <param name="refreshToken">The opaque refresh token string to revoke.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response indicating whether revocation succeeded.</returns>
    public async Task<ApiResponse<bool>> RevokeTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenRecord = await _dbContext.RefreshTokens.FirstOrDefaultAsync(r => r.Token == refreshToken, cancellationToken);
        if (tokenRecord == null)
        {
            return ApiResponse<bool>.FailureResult("Refresh token not found.");
        }

        tokenRecord.IsRevoked = true;
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Revoked refresh token for user {UserId}", tokenRecord.UserId);
        return ApiResponse<bool>.SuccessResult(true, "Refresh token revoked successfully.");
    }

    /// <summary>
    /// Retrieves user account details, current tenant association, and granted roles for the specified subject.
    /// </summary>
    /// <param name="userId">The unique identifier of the user.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An envelope response containing current user profile and tenant information.</returns>
    public async Task<ApiResponse<UserInfoDto>> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
        {
            return ApiResponse<UserInfoDto>.FailureResult("User not found.");
        }

        var tenant = await _dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == user.TenantId, cancellationToken);
        var roles = await _userManager.GetRolesAsync(user);

        var userInfo = new UserInfoDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            TenantId = user.TenantId,
            TenantIdentifier = tenant?.Identifier ?? string.Empty,
            TenantName = tenant?.Name ?? string.Empty,
            Roles = roles.ToList()
        };

        return ApiResponse<UserInfoDto>.SuccessResult(userInfo);
    }

    /// <summary>
    /// Generates a signed JWT access token explicitly embedding TenantId and all role claims.
    /// </summary>
    /// <param name="user">The authenticated user entity.</param>
    /// <param name="tenant">The verified tenant entity.</param>
    /// <param name="roles">The list of security roles assigned to the user.</param>
    /// <returns>A tuple containing the signed JWT string, unique JTI claim, and expiration timestamp.</returns>
    private (string AccessToken, string JwtId, DateTime ExpiresAtUtc) GenerateJwtToken(
        ApplicationUser user,
        Tenant tenant,
        IEnumerable<string> roles)
    {
        var jwtId = Guid.NewGuid().ToString();
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, jwtId),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),

            // Explicit Multi-Tenant Claims directly embedded in token
            new(CustomClaimTypes.TenantId, tenant.Id.ToString()),
            new(CustomClaimTypes.TenantIdentifier, tenant.Identifier),
            new(CustomClaimTypes.TenantName, tenant.Name),

            // Additional standard claims
            new(ClaimTypes.Name, user.FullName)
        };

        // Explicit Role Claims embedded for RBAC authorization
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = _jwtOptions.Issuer,
            Audience = _jwtOptions.Audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        var accessToken = tokenHandler.WriteToken(securityToken);

        return (accessToken, jwtId, expiresAtUtc);
    }

    /// <summary>
    /// Generates a cryptographically strong refresh token and persists it to the database.
    /// </summary>
    /// <param name="userId">The primary key of the owning user.</param>
    /// <param name="jwtId">The paired JWT access token JTI.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>The newly created and persisted <see cref="RefreshToken"/> entity.</returns>
    private async Task<RefreshToken> GenerateAndSaveRefreshTokenAsync(Guid userId, string jwtId, CancellationToken cancellationToken)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = Convert.ToBase64String(randomBytes),
            JwtId = jwtId,
            UserId = userId,
            IsRevoked = false,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiryDateUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpiryDays)
        };

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return refreshToken;
    }

    /// <summary>
    /// Extracts the claims principal from an expired or current access token, bypassing lifetime validation for refresh workflows.
    /// </summary>
    /// <param name="token">The JWT token string.</param>
    /// <returns>The extracted <see cref="ClaimsPrincipal"/>, or null if validation fails.</returns>
    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudience = _jwtOptions.Audience,
            ValidateIssuer = true,
            ValidIssuer = _jwtOptions.Issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey)),
            ValidateLifetime = false // Permit expired tokens to inspect claims during refresh
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token validation failed during claims extraction.");
            return null;
        }
    }
}
