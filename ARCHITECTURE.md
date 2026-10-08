# System Architecture Documentation

## Introduction
This document outlines the architectural design and principles of the Enterprise Multi-Tenant AI Research Assistant Platform. The system is engineered to provide a robust, scalable, and secure environment for advanced Retrieval-Augmented Generation (RAG) capabilities, ensuring strict data isolation and verifiable AI outputs. This documentation is intended for technical evaluators, architects, and senior engineering staff.

## Core Architectural Concepts

### Microservices Architecture
The system adopts a decoupled microservice architecture to isolate responsibilities, scale components independently, and allow specialized technology stacks for different domains:
*   **Frontend (Client Layer)**: Handles presentation logic and user interaction. Connects to the backend via REST APIs and WebSockets (SignalR).
*   **Backend (Enterprise Gateway)**: Serves as the primary entry point for all client requests. It enforces security, manages state, and orchestrates communication with other internal services.
*   **AI Microservice (Inference Engine)**: A specialized service dedicated to heavy computational tasks, including natural language processing, vector search, and execution of Large Language Models (LLMs).

### Event-Driven Asynchronous Processing
To ensure system responsiveness during intensive operations like document parsing, embedding generation, and indexing, the platform utilizes an event-driven model.
*   **RabbitMQ Event Broker**: Acts as the intermediary between the .NET Gateway and the Python AI Microservice. When a user uploads a document, the Gateway publishes an ingestion event. The AI service consumes this event, processes the document asynchronously, and updates the state upon completion. This prevents blocking operations on the primary web server.

### Multi-Tenancy and Logical Data Isolation
The platform is designed to securely host multiple distinct organizations (tenants) within a single deployed instance.
*   **Logical Isolation**: Data segregation is enforced at the database level using Entity Framework Core Global Query Filters. Every database record is associated with a specific Tenant ID.
*   **Role-Based Access Control (RBAC)**: JWT-based authentication validates user identity and tenant affiliation on every request, ensuring users can only access resources belonging to their explicitly assigned tenant and authorized role.

### Corrective Retrieval-Augmented Generation (CRAG)
To mitigate hallucinations and improve accuracy, the AI Inference Engine implements a Corrective RAG (CRAG) state machine using LangGraph.
*   **Self-Correcting Logic**: The system evaluates retrieved documents for relevance against the user query. If the retrieved context is insufficient or irrelevant, the state machine triggers a fallback mechanism, which may include query rewriting, web search, or returning a definitive "I do not know" response, rather than synthesizing unsupported claims.

### Hybrid Search (Reciprocal Rank Fusion)
The document retrieval mechanism employs a hybrid search strategy to maximize recall and precision.
*   **Vector Search (ChromaDB)**: Captures semantic meaning and contextual similarities using dense vector embeddings.
*   **Keyword Search (Rank-BM25)**: Ensures exact-match precision for specific terminology, acronyms, and proper nouns.
*   **Reciprocal Rank Fusion (RRF)**: The results from both search methods are combined and re-ranked using RRF, yielding a highly relevant composite context window for the LLM.

## Security Boundaries and Execution Environments
*   The AI Microservice includes a sandboxed Python execution environment specifically designed to handle mathematical computations securely, preventing arbitrary code execution on the host machine.
*   All inter-service communication within the internal network is trusted, but the Enterprise Gateway remains the sole entity exposing public endpoints.
