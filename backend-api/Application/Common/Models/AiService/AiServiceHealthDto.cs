using System.Text.Json.Serialization;

namespace EnterpriseApi.Application.Common.Models.AiService;

/// <summary>
/// Data transfer object reflecting health and index status of the Python AI microservice.
/// </summary>
public class AiServiceHealthDto
{
    /// <summary>
    /// Gets or sets the general health status flag ("healthy", "degraded", "unhealthy").
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the descriptive microservice service name.
    /// </summary>
    [JsonPropertyName("service")]
    public string Service { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the timestamp reported by the microservice.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the upstream LLM inference provider is active.
    /// </summary>
    [JsonPropertyName("groq_configured")]
    public bool GroqConfigured { get; set; }

    /// <summary>
    /// Gets or sets the active generation model identifier.
    /// </summary>
    [JsonPropertyName("groq_model")]
    public string GroqModel { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the aggregate dense vector count stored in the vector database.
    /// </summary>
    [JsonPropertyName("vector_collection_count")]
    public int VectorCollectionCount { get; set; }

    /// <summary>
    /// Gets or sets the number of sparse BM25 chunks indexed in the lexical store.
    /// </summary>
    [JsonPropertyName("sparse_chunks_indexed")]
    public int SparseChunksIndexed { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the LangGraph CRAG agent is active.
    /// </summary>
    [JsonPropertyName("langgraph_agent_active")]
    public bool LangGraphAgentActive { get; set; }
}
