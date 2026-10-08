using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Extensions;
using EnterpriseApi.Infrastructure.Services;
using EnterpriseApi.Middleware;

namespace EnterpriseApi;

/// <summary>
/// Entry point for the Enterprise AI Research Assistant API Gateway and host configuration.
/// </summary>
public class Program
{
    /// <summary>
    /// Configures services, registers the middleware pipeline, and executes the Web API host.
    /// </summary>
    /// <param name="args">Command line arguments passed to the application.</param>
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Register framework services and HTTP context accessor
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddControllers();
        builder.Services.AddHttpClient();

        // Register Clean Architecture infrastructure and application services
        builder.Services.AddScoped<ICurrentTenantService, CurrentTenantService>();
        builder.Services.AddScoped<IAuthService, AuthService>();

        // Register enterprise extensions (Identity, DB, JWT, Rate Limiting, Request Validation, Swagger)
        builder.Services.AddEnterpriseIdentityAndDb(builder.Configuration);
        builder.Services.AddEnterpriseJwtAuthentication(builder.Configuration);
        builder.Services.AddEnterpriseRateLimiting();
        builder.Services.AddEnterpriseRequestValidation();
        builder.Services.AddEnterpriseSwagger();

        // Configure Cross-Origin Resource Sharing (CORS) for trusted frontend consumers
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("GatewayCorsPolicy", policy =>
            {
                policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "https://portal.enterpriseai.local")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        var app = builder.Build();

        // 1. Global Exception Handling (RFC 7807 Problem Details serialization)
        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

        // 2. Security Headers Enforcement (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
        app.UseMiddleware<SecurityHeadersMiddleware>();

        // 3. Swagger API documentation (enabled for development and staging environments)
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Enterprise AI API Gateway v1");
                c.RoutePrefix = "swagger";
            });
        }

        // 4. Transport Security and routing
        app.UseHttpsRedirection();
        app.UseRouting();

        // 5. Cross-Origin Resource Sharing
        app.UseCors("GatewayCorsPolicy");

        // 6. Enterprise Rate Limiter
        app.UseRateLimiter();

        // 7. Multi-Tenant Context Resolution
        app.UseMiddleware<TenantResolutionMiddleware>();

        // 8. Authentication and Authorization
        app.UseAuthentication();
        app.UseAuthorization();

        // 9. Map API controller endpoints
        app.MapControllers();

        // 10. Health check endpoint for container orchestrators
        app.MapGet("/health", () => Results.Ok(new
        {
            Status = "Healthy",
            TimestampUtc = DateTime.UtcNow,
            Service = "EnterpriseApi-Gateway"
        })).RequireRateLimiting("GatewayTenantLimiter");

        // 11. End-to-End Gateway Status endpoint
        app.MapGet("/api/gateway-status", async (IHttpClientFactory clientFactory) => 
        {
            try
            {
                var client = clientFactory.CreateClient();
                var mlResponse = await client.GetFromJsonAsync<System.Text.Json.Nodes.JsonObject>("http://localhost:8000/api/health");
                return Results.Ok(new 
                { 
                    backend = "Secure Gateway Online", 
                    ml = mlResponse?["status"]?.ToString() ?? "ML Engine Offline" 
                });
            }
            catch
            {
                return Results.Ok(new { backend = "Secure Gateway Online", ml = "ML Engine Offline (Connection Failed)" });
            }
        });

        app.Run();
    }
}
