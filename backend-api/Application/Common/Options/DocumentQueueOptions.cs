namespace EnterpriseApi.Application.Common.Options;

/// <summary>
/// Configuration options for the asynchronous document queue publisher and background worker consumers.
/// </summary>
public class DocumentQueueOptions
{
    public const string SectionName = "DocumentQueue";

    /// <summary>
    /// Gets or sets the number of concurrent background consumer tasks executing ingestion jobs.
    /// </summary>
    public int MaxConcurrentWorkers { get; set; } = 4;

    /// <summary>
    /// Gets or sets the capacity limit for the bounded asynchronous channel.
    /// </summary>
    public int ChannelCapacity { get; set; } = 1000;

    /// <summary>
    /// Gets or sets the maximum retry attempts before moving a job to the dead-letter queue.
    /// </summary>
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>
    /// Gets or sets the base delay in milliseconds for exponential retry backoff.
    /// </summary>
    public int BaseRetryDelayMilliseconds { get; set; } = 500;

    /// <summary>
    /// Gets or sets the maximum delay ceiling in milliseconds for exponential retry backoff.
    /// </summary>
    public int MaxRetryDelayMilliseconds { get; set; } = 10000;

    /// <summary>
    /// Gets or sets the RabbitMQ broker hostname or IP address.
    /// </summary>
    public string RabbitMqHost { get; set; } = "localhost";

    /// <summary>
    /// Gets or sets the RabbitMQ AMQP port (default: 5672).
    /// </summary>
    public int RabbitMqPort { get; set; } = 5672;

    /// <summary>
    /// Gets or sets the RabbitMQ authentication username.
    /// </summary>
    public string RabbitMqUsername { get; set; } = "guest";

    /// <summary>
    /// Gets or sets the RabbitMQ authentication password.
    /// </summary>
    public string RabbitMqPassword { get; set; } = "guest";

    /// <summary>
    /// Gets or sets the RabbitMQ virtual host.
    /// </summary>
    public string RabbitMqVirtualHost { get; set; } = "/";

    /// <summary>
    /// Gets or sets the RabbitMQ topic exchange name for documents.
    /// </summary>
    public string ExchangeName { get; set; } = "enterprise.documents.exchange";

    /// <summary>
    /// Gets or sets the main queue name for document ingestion.
    /// </summary>
    public string QueueName { get; set; } = "documents.ingestion";

    /// <summary>
    /// Gets or sets the Dead-Letter Exchange (DLX) name.
    /// </summary>
    public string DeadLetterExchangeName { get; set; } = "enterprise.documents.dlx";

    /// <summary>
    /// Gets or sets the Dead-Letter Queue (DLQ) name.
    /// </summary>
    public string DeadLetterQueueName { get; set; } = "documents.ingestion.dlq";

    /// <summary>
    /// Gets or sets the message routing key.
    /// </summary>
    public string RoutingKey { get; set; } = "document.ingest";

    /// <summary>
    /// Gets or sets whether to attempt connecting to an external RabbitMQ broker daemon.
    /// If false, operates via high-performance non-blocking in-memory async channels.
    /// </summary>
    public bool UseRabbitMqBroker { get; set; } = false;
}
