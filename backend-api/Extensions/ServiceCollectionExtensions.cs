using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Domain.Constants;
using EnterpriseApi.Domain.Entities;
using EnterpriseApi.Infrastructure.Persistence;
using EnterpriseApi.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace EnterpriseApi.Extensions;

/// <summary>
/// Provides extension methods for registering enterprise services, authentication pipelines, and rate limiting policies.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the enterprise database context and ASP.NET Core Identity services.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <param name="configuration">The application configuration root.</param>
    /// <returns>The modified service collection.</returns>
    public static IServiceCollection AddEnterpriseIdentityAndDb(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=(localdb)\\mssqllocaldb;Database=EnterpriseAiPlatformDb;Trusted_Connection=True;MultipleActiveResultSets=true";

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
            }));

        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;
            options.Password.RequiredUniqueChars = 2;

            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = false;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }

    /// <summary>
    /// Configures multi-tenant JWT bearer authentication and role authorization policies.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <param name="configuration">The application configuration root.</param>
    /// <returns>The modified service collection.</returns>
    public static IServiceCollection AddEnterpriseJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection(JwtOptions.SectionName);
        services.Configure<JwtOptions>(jwtSection);

        var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions
        {
            SecretKey = "EnterpriseAiResearchAssistantPlatformUltraSecretKey2026!#SecureSigningKeyMustBeAtLeast256BitsLong",
            Issuer = "https://api.enterpriseai.local",
            Audience = "https://gateway.enterpriseai.local",
            ExpiryMinutes = 60
        };

        var keyBytes = Encoding.UTF8.GetBytes(jwtOptions.SecretKey);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false; // Configurable for dev/prod environments
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtOptions.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = ClaimTypes.Role,
                NameClaimType = ClaimTypes.NameIdentifier
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                    {
                        context.Response.Headers.Append("Token-Expired", "true");
                    }
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireAdminRole", policy =>
                policy.RequireRole(RoleConstants.Admin));

            options.AddPolicy("RequireResearcherRole", policy =>
                policy.RequireRole(RoleConstants.Researcher, RoleConstants.Admin));

            options.AddPolicy("RequireTenantContext", policy =>
                policy.RequireClaim(CustomClaimTypes.TenantId));
        });

        return services;
    }

    /// <summary>
    /// Registers enterprise rate limiting partitions for authentication endpoints and general API Gateway traffic.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <returns>The modified service collection.</returns>
    public static IServiceCollection AddEnterpriseRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                var problem = new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Too Many Requests",
                    Detail = "API Gateway rate limit exceeded. Please back off and retry later.",
                    Instance = context.HttpContext.Request.Path,
                    Type = "https://tools.ietf.org/html/rfc6585#section-4"
                };
                await context.HttpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            };

            // Dedicated rate limiter for sensitive authentication endpoints (10 requests per minute)
            options.AddFixedWindowLimiter("AuthRateLimiter", opt =>
            {
                opt.PermitLimit = 10;
                opt.Window = TimeSpan.FromMinutes(1);
                opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                opt.QueueLimit = 2;
            });

            // General gateway partitioned rate limiter by tenant ID or client IP
            options.AddPolicy("GatewayTenantLimiter", httpContext =>
            {
                var partitionKey = httpContext.User.FindFirst(CustomClaimTypes.TenantId)?.Value
                    ?? httpContext.Request.Headers["X-Tenant-ID"].FirstOrDefault()
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "anonymous_client";

                return RateLimitPartition.GetTokenBucketLimiter(partitionKey, _ => new TokenBucketRateLimiterOptions
                {
                    TokenLimit = 100,
                    QueueLimit = 10,
                    TokensPerPeriod = 20,
                    ReplenishmentPeriod = TimeSpan.FromSeconds(10),
                    AutoReplenishment = true
                });
            });
        });

        return services;
    }

    /// <summary>
    /// Configures the request validation behavior to return RFC 7807 problem details for invalid model states.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <returns>The modified service collection.</returns>
    public static IServiceCollection AddEnterpriseRequestValidation(this IServiceCollection services)
    {
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value?.Errors.Select(err => err.ErrorMessage).ToArray() ?? Array.Empty<string>()
                    );

                var problemDetails = new ValidationProblemDetails(context.ModelState)
                {
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                    Title = "One or more validation errors occurred in the request payload.",
                    Status = StatusCodes.Status400BadRequest,
                    Detail = "Refer to the errors property for individual field validation constraints.",
                    Instance = context.HttpContext.Request.Path
                };

                return new BadRequestObjectResult(problemDetails)
                {
                    ContentTypes = { "application/problem+json" }
                };
            };
        });

        return services;
    }

    /// <summary>
    /// Configures Swagger OpenAPI specification generation with JWT Bearer authorization support.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <returns>The modified service collection.</returns>
    public static IServiceCollection AddEnterpriseSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Enterprise AI Research Assistant API Gateway",
                Version = "v1",
                Description = "Secure .NET 8 Web API Gateway with Multi-Tenant JWT Authentication and RBAC."
            });

            var securityScheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Description = "Enter JWT Bearer token formatted as: Bearer {your_token}",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Reference = new OpenApiReference
                {
                    Id = JwtBearerDefaults.AuthenticationScheme,
                    Type = ReferenceType.SecurityScheme
                }
            };

            options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, securityScheme);
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                { securityScheme, Array.Empty<string>() }
            });
        });

        return services;
    }
}
