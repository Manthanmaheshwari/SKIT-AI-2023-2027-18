using System.Net.Http.Headers;
using EnterpriseApi.Application.Common.Interfaces;
using EnterpriseApi.Application.Common.Options;
using EnterpriseApi.Infrastructure.Http;
using EnterpriseApi.Infrastructure.Http.CircuitBreaker;
using EnterpriseApi.Infrastructure.Http.Handlers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace EnterpriseApi.Extensions;

/// <summary>
/// Extension methods for configuring secure, resilient inter-service HTTP clients
/// communicating with the downstream Python FastAPI AI microservice.
/// </summary>
public static class AiServiceCollectionExtensions
{
    /// <summary>
    /// Registers the typed <see cref="IAiServiceClient"/> along with its configuration options,
    /// circuit breaker state manager, authentication and tenant delegating handlers, and socket pool settings.
    /// </summary>
    /// <param name="services">The service collection instance.</param>
    /// <param name="configuration">The root configuration provider.</param>
    /// <returns>The modified service collection for chaining.</returns>
    public static IServiceCollection AddAiMicroserviceClient(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. Bind configuration options
        var configSection = configuration.GetSection(AiServiceOptions.SectionName);
        services.Configure<AiServiceOptions>(configSection);

        // 2. Register thread-safe circuit breaker singleton to persist state across HTTP requests
        services.AddSingleton<ICircuitBreakerManager, CircuitBreakerManager>();

        // 3. Register delegating handlers as transient message pipeline components
        services.AddTransient<CorrelationIdDelegatingHandler>();
        services.AddTransient<TenantHeaderPropagationDelegatingHandler>();
        services.AddTransient<BearerTokenPropagationDelegatingHandler>();
        services.AddTransient<AiServiceResilienceHandler>();

        // 4. Configure typed HTTP Client with IHttpClientFactory
        services.AddHttpClient<IAiServiceClient, AiServiceClient>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;

            var baseUri = options.BaseUrl.TrimEnd('/') + "/";
            client.BaseAddress = new Uri(baseUri);
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, options.TimeoutSeconds));

            // Default service headers
            client.DefaultRequestHeaders.Add("X-Client-Service", options.ClientServiceName);
            client.DefaultRequestHeaders.Accept.Clear();
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        })
        // Pipeline execution order: CorrelationId -> Tenant -> Bearer/Auth -> Resilience -> Primary Sockets Handler
        .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
        .AddHttpMessageHandler<TenantHeaderPropagationDelegatingHandler>()
        .AddHttpMessageHandler<BearerTokenPropagationDelegatingHandler>()
        .AddHttpMessageHandler<AiServiceResilienceHandler>()
        .ConfigurePrimaryHttpMessageHandler(sp =>
        {
            var options = sp.GetRequiredService<IOptions<AiServiceOptions>>().Value;

            return new SocketsHttpHandler
            {
                // DNS refresh interval: mitigates stale IP caching in container orchestrators (Kubernetes / Docker)
                PooledConnectionLifetime = TimeSpan.FromMinutes(Math.Max(1, options.PooledConnectionLifetimeMinutes)),
                // Idle connection timeout before eviction from pool
                PooledConnectionIdleTimeout = TimeSpan.FromMinutes(Math.Max(1, options.PooledConnectionIdleTimeoutMinutes)),
                // Max concurrent socket streams per upstream node
                MaxConnectionsPerServer = Math.Max(10, options.MaxConnectionsPerServer),
                // Allow HTTP/2 multiplexing across existing TCP connections
                EnableMultipleHttp2Connections = true
            };
        });

        return services;
    }
}
