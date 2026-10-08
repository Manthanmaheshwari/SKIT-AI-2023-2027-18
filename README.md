# Enterprise Multi-Tenant AI Research Assistant Platform

## 1. Executive Summary and System Architecture

### 1.1 Executive Summary
The Enterprise Multi-Tenant AI Research Assistant Platform is a production-grade, distributed Retrieval-Augmented Generation (RAG) system engineered for high-assurance organizational research, compliance verification, and knowledge synthesis. Modern enterprise deployments of Large Language Models (LLMs) frequently suffer from three critical vulnerabilities: non-deterministic hallucinations, cross-tenant data leakage, and untraceable synthesis lacking provenance. This platform directly eliminates these vulnerabilities by enforcing a zero-trust multi-tenant architecture, strict visual citation grounding via an integrated PDF.js canvas engine, and a self-correcting Corrective RAG (CRAG) state machine.

Built to enterprise standards, the platform serves three primary organizational personas:
* Research Scientists and Knowledge Workers: Interact with an air-gapped, responsive 50/50 split-screen workstation to execute hybrid vector-keyword inquiries against ingested literature, inspect live document citations, and verify synthetic conclusions against highlighted bounding boxes.
* System and Tenant Administrators: Provision organizational tenant boundaries, configure role-based access control (RBAC) policies, manage compute quotas, and observe cluster indexing workloads.
* Compliance and Security Officers: Audit an immutable forensic telemetry stream capturing every authentication event, cross-tenant authorization evaluation, vector query, and document ingestion task.

### 1.2 System Architecture Overview
The platform employs a decoupled, polyglot microservice architecture designed for horizontal scalability, fault isolation, and independent technology lifecycle management.

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 18 (Vite) + Tailwind CSS + React Router DOM + PDF.js Canvas Split-View     |
|  Operational Portals: User Workspace | Admin Dashboard | Compliance Audit Portal  |
+-----------------------------------------------------------------------------------+
                                          |
                         HTTPS / TLS 1.3  | REST API / JWT Claims
                                          v
+-----------------------------------------------------------------------------------+
|                        ENTERPRISE GATEWAY & SECURITY LAYER                        |
|                     ASP.NET Core 8 Web API / C# Enterprise API                    |
|  - Middleware Pipeline: Security Headers, RFC 7807 Exceptions, Rate Limiting      |
|  - Tenant Resolution & Isolation Pipeline (Claim / Header / Route Validation)     |
|  - ASP.NET Identity, JWT Authentication, Refresh Token Rotation & Revocation      |
|  - Entity Framework Core with Global Query Filters (DbSet<T> Partitioning)        |
+-----------------------------------------------------------------------------------+
             |                                                  |
             | Relational State & RBAC                          | Asynchronous Events
             v                                                  v
+-----------------------------+               +-------------------------------------+
|      PERSISTENCE LAYER      |               |         EVENT BROKER LAYER          |
|    Microsoft SQL Server     |               |          RabbitMQ Exchange          |
| - Tenant Metadata & Keys    |               | - document.ingestion.queue          |
| - Identity Principals & RBAC|               | - embedding.dispatch.queue          |
| - Refresh Token Store       |               | - Dead Letter Exchanges (DLX)       |
+-----------------------------+               +-------------------------------------+
                                                                |
                                             AMQP 0-9-1 Worker  | Ingestion Tasks
                                             Event Consumption  v
+-----------------------------------------------------------------------------------+
|                        AI INFERENCE & RETRIEVAL ENGINE                            |
|                       Python 3.11+ / FastAPI Microservice                         |
|  - Hybrid Search Pipeline: Dense Vector (ChromaDB) + Sparse Lexical (Rank-BM25)   |
|  - Rank Fusion: Reciprocal Rank Fusion (RRF) Scoring Pipeline                      |
|  - State Machine Evaluator: LangGraph Corrective RAG (CRAG) Workflow              |
|  - Local Sandboxed Inference: DeepSeek-R1 (Local Ollama Engine)                   |
|  - Multi-Tenant Vector Segregation: ChromaDB Collection Metadata Partitioning     |
+-----------------------------------------------------------------------------------+
```

### 1.3 Microservices and Tier Breakdown

#### Client Presentation Layer (`/frontend`)
* Framework: React 18 with Vite build tooling and React Router DOM v6.
* Styling Engine: Tailwind CSS adhering to enterprise dark-mode aesthetics (slate-950/zinc palettes, clean 1px borders, subtle focus rings, minimal shadows).
* Workstation Interface: A rigid, responsive 50/50 split-view layout. The left pane embeds an asynchronous PDF.js canvas viewer supporting smooth multi-page continuous scrolling, high-DPI (Retina) scaling, explicit page controls, and real-time bounding box search highlight overlays. The right pane provides the enterprise AI dialogue interface featuring chain-of-thought telemetry, model parameters, and visual citation cross-referencing.
* Access Control: Client-side route guards (`ProtectedRoute.jsx`) dynamically enforce role permissions (`Admin`, `Researcher`, `Viewer`), redirecting unauthorized principals to diagnostic security policy fallback views.

#### Enterprise Gateway Layer (`/backend-api`)
* Framework: Microsoft .NET 8 Web API using C# 12.
* Security Middleware: Enforces HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and Referrer-Policy (`strict-origin-when-cross-origin`).
* Exception Handling: Standardized RFC 7807 Problem Details middleware intercepts all runtime errors to guarantee that internal stack traces and database schema specifics are never leaked to clients.
* Multi-Tenant Resolution: Intercepts incoming requests via `TenantResolutionMiddleware`, reading tenant slugs and GUIDs from route segments, the `X-Tenant-Key` header, or JWT claims.
* Persistence: Entity Framework Core with Global Query Filters automatically applies `WHERE TenantId = @CurrentTenantId` to every relational entity query, preventing cross-tenant data bleed at the database query compile step.
* Rate Limiting: Fixed-window partitioners enforce strict token quotas per tenant boundary to prevent Denial of Service and API exhaustion.

#### AI Inference and Retrieval Layer (`/ai-service`)
* Framework: Python 3.11 with FastAPI and Uvicorn.
* Vector Embeddings & Storage: ChromaDB hosts dense semantic vector embeddings partitioned by tenant namespaces.
* Sparse Keyword Engine: Rank-BM25 constructs inverted indices to provide exact-match keyword recall for acronyms, technical IDs, and legal identifiers.
* Reciprocal Rank Fusion (RRF): Combines dense and sparse ranked retrieval sets into a single re-ranked candidate pool using reciprocal scoring functions.
* Corrective RAG (CRAG) Engine: Built using LangGraph state machines. Evaluates retrieved document relevance against input queries. If candidate relevance falls below strict confidence thresholds (default: 0.82), the engine triggers corrective query rewriting or returns an unambiguous refusal to synthesize unsupported statements.
* Local Model Inference: Interfaces with DeepSeek-R1 running via a local, air-gapped Ollama instance to execute natural language reasoning and citation alignment without external cloud dependency.

#### Event Broker Layer (RabbitMQ)
* Role: Decouples long-running document ingestion, PDF parsing, tokenization, and vector indexing operations from client HTTP request-response cycles.
* Guarantees: Uses transactional acknowledgments, persistent message delivery, and Dead-Letter Exchanges (DLX) to guarantee zero document loss during ingestion surges.

---

### 1.4 End-to-End System Data Flow

```text
[1. Document Ingestion Flow]
User Upload -> .NET Gateway -> Validate Tenant Boundary & Quotas -> Publish Event (RabbitMQ)
                                                                           |
                                                                           v
ChromaDB (Dense) <--- Embed Chunks <--- Python Ingestion Worker <----------+
       +                               (PDF Parsing / BM25)
       v
Rank-BM25 (Sparse)

[2. Hybrid CRAG Query & Citation Flow]
User Query -> .NET Gateway (Validate JWT & Inject Tenant ID) -> AI Service (/search/hybrid)
                                                                           |
                                                                           v
Dense Search (ChromaDB) + Sparse Search (BM25) -> Reciprocal Rank Fusion (RRF)
                                                                           |
                                                                           v
LangGraph CRAG Evaluator ---> [Score >= 0.82] ---> DeepSeek-R1 Inference
                                      |                       |
                                      v (Score < 0.82)         v
                            Query Rewrite Fallback    Grounded Output + Citations
                                                               |
                                                               v
Split-View Frontend: Canvas Bounding Boxes Highlighted + AI Reasoning Stream
```

1. **Ingestion Pipeline**:
   * A user uploads a research document through the gateway.
   * The .NET Gateway authenticates the caller, validates tenant file quotas, writes metadata to SQL Server, and publishes an ingestion payload to the RabbitMQ exchange.
   * The Python AI microservice consumes the message asynchronously, parses text chunks, extracts page coordinates, computes vector embeddings, updates ChromaDB, and indexes tokens in Rank-BM25.
   * Ingestion status is updated in the gateway database and propagated to the client.

2. **Query and Retrieval Pipeline**:
   * A researcher submits an inquiry in the User Workspace.
   * The .NET Gateway validates JWT claims, injects the verified `TenantId`, and forwards the request to the AI microservice.
   * The AI service executes parallel searches across ChromaDB (dense semantic similarity) and Rank-BM25 (sparse lexical match).
   * Results are merged and re-ranked using Reciprocal Rank Fusion (RRF).
   * LangGraph evaluates retrieval relevance. If context is sufficient, DeepSeek-R1 generates a grounded synthesis with exact page numbers and coordinate bounding boxes.
   * The response is delivered to the client, where the PDF.js canvas viewer automatically highlights the referenced bounding box while the chat pane renders the citation.

---

## 2. Multi-Tenancy and Security Architecture

### 2.1 Logical Data Segregation
The platform enforces multi-tenancy at every tier using logical data isolation:
* **Relational Isolation**: All domain entities inherit from a base tenant model containing `TenantId (Guid)`. Entity Framework Core registers a Global Query Filter on every mapped entity:
  ```csharp
  modelBuilder.Entity<TenantDocument>()
      .HasQueryFilter(doc => doc.TenantId == _currentTenantService.TenantId);
  ```
  This filter is compiled directly into generated SQL queries, making cross-tenant data access impossible even in the event of missing controller-level filters.
* **Vector Store Isolation**: ChromaDB collections and vector metadata are segregated using tenant identifiers. Vector queries apply strict metadata filtering:
  ```python
  collection.query(
      query_embeddings=embeddings,
      where={"tenant_id": request.tenant_id},
      n_results=request.top_k
  )
  ```

### 2.2 Role-Based Access Control (RBAC)
The platform defines three standardized application roles across all tenants:

| Role Key | Name | Permissions and Scope | Accessible Routes |
| :--- | :--- | :--- | :--- |
| `Admin` | Platform / Tenant Administrator | Full tenant configuration, user management, quota allocation, system health oversight, and compliance auditing. | `/workspace`, `/admin`, `/audit` |
| `Researcher` | Research Scientist | Document ingestion, RAG query execution, citation inspection, and research thread management. | `/workspace` |
| `Viewer` | Read-Only Principal | Read-only access to existing synthesized research reports, documents, and visual citations. No ingestion or configuration privileges. | `/workspace` (Read-only) |

### 2.3 JWT Claims Specification
Upon successful authentication, the .NET Enterprise Gateway issues a signed JSON Web Token (HMAC-SHA256, 256-bit secret key) containing standard RFC 7519 claims and custom enterprise tenant claims:

| Claim Key | Standard / Custom | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `sub` | RFC 7519 (`NameIdentifier`) | Unique user principal identifier (GUID). | `usr_e92bf170-42c1-4b13-9118-a6217c919d38` |
| `email` | RFC 7519 (`Email`) | Primary corporate email address of the principal. | `researcher@skit-ai.edu` |
| `tenant_id` | Enterprise Custom | Immutable organization tenant GUID. | `ten_94a73f82-31ec-46bc-92cb-5e16f5c0981b` |
| `tenant_identifier`| Enterprise Custom | Human-readable alphanumeric tenant slug. | `skit-ai-labs` |
| `tenant_name` | Enterprise Custom | Legal or organizational name of the tenant. | `SKIT AI Research Division` |
| `role` | RFC 7519 (`Role`) | Assigned application role(s) for policy checks. | `Admin`, `Researcher`, or `Viewer` |
| `jti` | RFC 7519 | Unique token identifier used to prevent replay attacks. | `c683b519-6bc2-4ef8-a402-23c21a148911` |
| `exp` | RFC 7519 | Expiration UNIX timestamp (default: 60 minutes). | `1791550800` |

---

## 3. Comprehensive REST API Documentation

### 3.1 Standardized API Envelope
All responses from the .NET Enterprise Gateway conform to the standardized `ApiResponse<T>` envelope format:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": [],
  "timestampUtc": "2026-09-25T14:32:00.1234567Z"
}
```

In the event of validation or execution failure, `success` is `false`, `data` is `null`, and `errors` contains detailed error messages:

```json
{
  "success": false,
  "message": "Request validation failed.",
  "data": null,
  "errors": [
    "The Email field is required.",
    "The Password field must be at least 8 characters long."
  ],
  "timestampUtc": "2026-09-25T14:32:00.1234567Z"
}
```

---

### 3.2 Enterprise Gateway Endpoints (.NET 8 Web API)

Base URL: `https://api.enterpriseai.local/api/v1` (Development: `http://localhost:5000/api/v1`)

| HTTP Method | Route Endpoint | Role Required | Description | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Anonymous | Authenticates a tenant principal and returns JWT access and refresh token pair. | 20 req / min |
| `POST` | `/auth/register` | Anonymous | Provisions a new user account under a specified tenant boundary. | 20 req / min |
| `POST` | `/auth/refresh` | Anonymous | Rotates an expired access token using an active refresh token. | 20 req / min |
| `POST` | `/auth/revoke` | Authenticated | Revokes an active refresh token to invalidate a user session. | 20 req / min |
| `GET` | `/auth/me` | Authenticated | Retrieves current user profile, tenant metadata, and granted roles. | Standard |
| `GET` | `/health` | Anonymous | Verifies gateway operational status and database connectivity. | Standard |

---

#### Endpoint: `POST /api/v1/auth/login`
Authenticates a user against ASP.NET Core Identity within a designated tenant context.

**Headers:**
```http
Content-Type: application/json
Accept: application/json
X-Tenant-Key: skit-ai-labs
```

**Request Payload:**
```json
{
  "email": "niyukti.janu@skit-research.edu",
  "password": "SecurePassword2026!#",
  "tenantIdentifier": "skit-ai-labs"
}
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "message": "Authentication successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d82f7c01b4e24a91a457319fbb34e128c701...",
    "expiresAtUtc": "2026-09-25T15:32:00Z",
    "tenantId": "94a73f82-31ec-46bc-92cb-5e16f5c0981b",
    "tenantIdentifier": "skit-ai-labs",
    "email": "niyukti.janu@skit-research.edu",
    "fullName": "Niyukti Singh Janu",
    "roles": [
      "Admin"
    ]
  },
  "errors": [],
  "timestampUtc": "2026-09-25T14:32:00Z"
}
```

---

#### Endpoint: `POST /api/v1/auth/register`
Provisions a new principal under an organization tenant with explicit role assignment.

**Request Payload:**
```json
{
  "email": "researcher@skit-research.edu",
  "password": "StrongPassword2026!#",
  "confirmPassword": "StrongPassword2026!#",
  "fullName": "Dr. Sarah Chen",
  "tenantIdentifier": "skit-ai-labs",
  "assignedRoles": [
    "Researcher"
  ]
}
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "message": "User registered and provisioned successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "7c12bf991a024e1288b8...",
    "expiresAtUtc": "2026-09-25T15:32:00Z",
    "tenantId": "94a73f82-31ec-46bc-92cb-5e16f5c0981b",
    "tenantIdentifier": "skit-ai-labs",
    "email": "researcher@skit-research.edu",
    "fullName": "Dr. Sarah Chen",
    "roles": [
      "Researcher"
    ]
  },
  "errors": [],
  "timestampUtc": "2026-09-25T14:32:00Z"
}
```

---

#### Endpoint: `POST /api/v1/auth/refresh`
Refreshes an expired JWT access token using a valid, non-expired refresh token. Refresh tokens are rotated upon each use.

**Request Payload:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_token_payload...",
  "refreshToken": "d82f7c01b4e24a91a457319fbb34e128c701..."
}
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "message": "Token renewed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token_payload...",
    "refreshToken": "e910fa241c0941ab9981...",
    "expiresAtUtc": "2026-09-25T16:32:00Z",
    "tenantId": "94a73f82-31ec-46bc-92cb-5e16f5c0981b",
    "tenantIdentifier": "skit-ai-labs",
    "email": "niyukti.janu@skit-research.edu",
    "fullName": "Niyukti Singh Janu",
    "roles": [
      "Admin"
    ]
  },
  "errors": [],
  "timestampUtc": "2026-09-25T15:32:00Z"
}
```

---

#### Endpoint: `POST /api/v1/auth/revoke`
Explicitly invalidates an active refresh token, immediately terminating the client session.

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Payload:**
```json
"d82f7c01b4e24a91a457319fbb34e128c701..."
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "message": "Token revoked successfully.",
  "data": true,
  "errors": [],
  "timestampUtc": "2026-09-25T14:32:00Z"
}
```

---

#### Endpoint: `GET /api/v1/auth/me`
Retrieves principal profile, verified tenant scope, and granted roles.

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "message": "Current user context retrieved.",
  "data": {
    "id": "e92bf170-42c1-4b13-9118-a6217c919d38",
    "email": "niyukti.janu@skit-research.edu",
    "fullName": "Niyukti Singh Janu",
    "tenantId": "94a73f82-31ec-46bc-92cb-5e16f5c0981b",
    "tenantIdentifier": "skit-ai-labs",
    "tenantName": "SKIT AI Research Division",
    "roles": [
      "Admin"
    ]
  },
  "errors": [],
  "timestampUtc": "2026-09-25T14:32:00Z"
}
```

---

### 3.3 AI Inference and Retrieval Endpoints (Python FastAPI Microservice)

Base URL: `http://localhost:8000` (Internal Gateway-to-Service Network)

| HTTP Method | Route Endpoint | Access Scope | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ingest` | Internal Microservice | Ingests raw document text, chunks content, computes dense embeddings, updates ChromaDB, and indexes sparse BM25 tokens. |
| `POST` | `/api/v1/search/hybrid` | Internal Microservice | Executes a hybrid search combining ChromaDB dense vectors and Rank-BM25 sparse tokens, fused via Reciprocal Rank Fusion (RRF). |
| `GET` | `/health` | Public / Orchestrator | Health check returning service availability and engine status. |

---

#### Endpoint: `POST /api/v1/ingest`
Ingests document text into the tenant vector and sparse index collections.

**Request Payload:**
```json
{
  "tenant_id": "ten_94a73f82-31ec-46bc-92cb-5e16f5c0981b",
  "document_id": "doc_crag_arch_whitepaper_2026",
  "content": "Large language models often exhibit hallucinations when queried on private enterprise repositories. The Corrective Retrieval-Augmented Generation (CRAG) framework introduces a deterministic state machine evaluator that dynamically scores retrieved context prior to inference synthesis...",
  "metadata": {
    "title": "DeepSeek-R1 Architecture Whitepaper",
    "author": "SKIT AI Research Labs",
    "category": "Architecture Specification",
    "pages_count": 2,
    "classification": "Confidential"
  }
}
```

**Response Payload (`202 Accepted`):**
```json
{
  "message": "Document ingestion processed successfully.",
  "document_id": "doc_crag_arch_whitepaper_2026"
}
```

---

#### Endpoint: `POST /api/v1/search/hybrid`
Executes hybrid dense-sparse retrieval and fuses ranked candidates via Reciprocal Rank Fusion (RRF).

**Request Payload:**
```json
{
  "tenant_id": "ten_94a73f82-31ec-46bc-92cb-5e16f5c0981b",
  "query": "How does Corrective RAG mitigate hallucinations in distributed architectures?",
  "top_k": 3
}
```

**Response Payload (`200 OK`):**
```json
{
  "query": "How does Corrective RAG mitigate hallucinations in distributed architectures?",
  "tenant_id": "ten_94a73f82-31ec-46bc-92cb-5e16f5c0981b",
  "results": [
    {
      "document_id": "doc_crag_arch_whitepaper_2026",
      "chunk_id": "chunk_001_p1",
      "content": "The CRAG framework introduces a deterministic state machine evaluator that dynamically scores retrieved context prior to inference synthesis.",
      "score": 0.032258,
      "metadata": {
        "page": 1,
        "section": "1.1",
        "bounding_box": {
          "x": 10.0,
          "y": 28.0,
          "width": 80.0,
          "height": 7.5
        }
      }
    },
    {
      "document_id": "doc_crag_arch_whitepaper_2026",
      "chunk_id": "chunk_002_p1",
      "content": "Retrieval precision is optimized by merging dense vector similarities (ChromaDB) with sparse BM25 keyword indices.",
      "score": 0.016393,
      "metadata": {
        "page": 1,
        "section": "1.2",
        "bounding_box": {
          "x": 10.0,
          "y": 48.0,
          "width": 80.0,
          "height": 8.5
        }
      }
    }
  ]
}
```

---

## 4. Local Setup, Infrastructure, and Environment Configuration

### 4.1 System Prerequisites
Ensure the following runtimes and tools are installed on your host machine prior to initialization:
* **Node.js**: v20.x LTS or higher and `npm` v10.x+
* **.NET SDK**: Microsoft .NET 8.0 SDK (`dotnet --version` >= 8.0.100)
* **Python**: Python 3.11+ with `pip` and `virtualenv`
* **Microsoft SQL Server**: LocalDB, Express, or standard SQL Server 2022 instance
* **RabbitMQ**: RabbitMQ 3.12+ message broker with STOMP and Management plugins enabled
* **Ollama**: Local Ollama instance with the `deepseek-r1` model pulled:
  ```bash
  ollama pull deepseek-r1
  ```

---

### 4.2 Configuration and Environment Variables

#### Backend Gateway Configuration (`backend-api/appsettings.json`)
The .NET Gateway reads configuration settings from `appsettings.json` or equivalent environment variables:

| Setting Key | Environment Variable Equivalent | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` | `Server=(localdb)\mssqllocaldb;Database=EnterpriseAiPlatformDb;Trusted_Connection=True;MultipleActiveResultSets=true` | MSSQL Server connection string. |
| `JwtSettings:SecretKey` | `JwtSettings__SecretKey` | `EnterpriseAiResearchAssistantPlatformUltraSecretKey2026!#SecureSigningKeyMustBeAtLeast256BitsLong` | Minimum 256-bit symmetric encryption key used for signing JWT tokens. |
| `JwtSettings:Issuer` | `JwtSettings__Issuer` | `https://api.enterpriseai.local` | Expected issuer claim (`iss`) for incoming tokens. |
| `JwtSettings:Audience` | `JwtSettings__Audience` | `https://gateway.enterpriseai.local` | Expected audience claim (`aud`) for incoming tokens. |
| `JwtSettings:ExpiryMinutes` | `JwtSettings__ExpiryMinutes` | `60` | Lifespan of newly issued access tokens (minutes). |
| `JwtSettings:RefreshTokenExpiryDays`| `JwtSettings__RefreshTokenExpiryDays` | `7` | Retention window for refresh tokens (days). |
| `RateLimiting:PermitLimit` | `RateLimiting__PermitLimit` | `20` | Allowed requests per window interval. |
| `RateLimiting:WindowInSeconds` | `RateLimiting__WindowInSeconds` | `60` | Fixed rate limiting window duration (seconds). |
| `RateLimiting:QueueLimit` | `RateLimiting__QueueLimit` | `5` | Maximum requests buffered before dropping. |

#### AI Microservice Configuration (`ai-service/.env`)
The Python AI microservice reads environment variables from an optional `.env` file or host environment:

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `HOST` | `0.0.0.0` | Bind host address for the FastAPI Uvicorn server. |
| `PORT` | `8000` | Port for the FastAPI HTTP listener. |
| `CHROMA_PERSIST_DIRECTORY` | `./chroma_db` | Filesystem path for ChromaDB persistent vector storage. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Endpoint for the local air-gapped Ollama inference engine. |
| `OLLAMA_MODEL` | `deepseek-r1` | Model tag executed for reasoning and CRAG evaluation. |
| `RABBITMQ_HOST` | `localhost` | Host address of the RabbitMQ event broker. |
| `RABBITMQ_PORT` | `5672` | AMQP port of the RabbitMQ broker. |
| `RABBITMQ_USER` | `guest` | RabbitMQ authentication username. |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ authentication password. |

#### Frontend Configuration (`frontend/.env`)
The React Vite frontend application reads environment variables with the `VITE_` prefix:

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Base URL pointing to the .NET Enterprise Gateway. |
| `VITE_AI_SERVICE_URL` | `http://localhost:8000/api/v1` | Direct service URL for development inspection. |
| `VITE_ENABLE_MOCK_AUTH` | `false` | Enables client-side role simulator dropdown in top navigation. |

---

### 4.3 Step-by-Step Installation and Execution Guide

#### Step 1: Initialize Database and Run EF Core Migrations
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend-api
   ```
2. Restore .NET dependencies:
   ```bash
   dotnet restore
   ```
3. Verify that your MSSQL instance is running. Then apply Entity Framework Core database migrations to create the schema, tables, identity indexes, and global query filters:
   ```bash
   dotnet ef database update
   ```
   *(Note: If the `dotnet-ef` global tool is not installed, install it using `dotnet tool install --global dotnet-ef`.)*
4. Run the .NET Enterprise Gateway:
   ```bash
   dotnet run
   ```
   The gateway will initialize and listen on `https://localhost:5001` and `http://localhost:5000`. Swagger API documentation is accessible at `http://localhost:5000/swagger`.

---

#### Step 2: Set Up and Run the AI Microservice
1. Open a separate terminal and navigate to the AI service directory:
   ```bash
   cd ai-service
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   # On Windows: venv\Scripts\activate
   ```
3. Install required Python packages:
   ```bash
   pip install --upgrade pip
   pip install fastapi uvicorn pydantic chromadb rank-bm25 pika requests
   ```
4. Start the local Ollama instance (in a separate terminal) and pull DeepSeek-R1:
   ```bash
   ollama run deepseek-r1
   ```
5. Launch the FastAPI application using Uvicorn:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The AI service documentation will be accessible at `http://localhost:8000/docs`.

---

#### Step 3: Set Up and Run the Frontend Portal
1. Open a third terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application by opening `http://localhost:3000` in your browser.

---

## 5. Frontend Workstation and Portal Architecture

The frontend provides three isolated operational portals accessible via global client routing:

### 5.1 User Workspace Portal (`/workspace`)
The core interface for researchers. It features a rigid 50/50 split-screen workstation:
* **Left Pane (PDF.js Canvas Viewer)**:
  * Employs an isolated Web Worker (`pdf.worker.min.mjs`) to offload parsing, decoding, and vector math away from the main UI thread.
  * Dynamically cancels active `RenderTask` promises upon page switches or zoom operations to prevent canvas context locking.
  * Supports smooth multi-page continuous scrolling and explicit page jump controls.
  * Renders a coordinate-based search bounding box overlay with confidence ratings.
* **Right Pane (AI Research Dialogue)**:
  * Displays reasoning streams (LangGraph Chain of Thought).
  * Synthesizes answers referencing grounded source documents.
  * Citation tags cross-reference highlighted bounding boxes in the left pane.

### 5.2 Admin Management Dashboard (`/admin`)
Restricted to principals with the `Admin` role.
* Displays infrastructure health and ingestion pipeline status.
* Catalogs registered tenant organizations and their isolation settings.
* Provides user role assignment and compute quota configuration.

### 5.3 Compliance and Audit Portal (`/audit`)
Restricted to principals with the `Admin` role.
* Provides a tamper-evident audit trail capturing authentication, document access, and query executions.
* Retains telemetry for 365 days under organizational compliance policies.
* Supports real-time filtering by severity, status, principal, and tenant scope.

---

## 6. Engineering Standards and Development Guidelines

### 6.1 Git Branching Strategy
The project follows a trunk-based branching model with dedicated contributor feature branches:
* `main`: Protected production branch. Direct pushes are disallowed. All changes must arrive via approved Pull Requests.
* Feature and Contributor Branches: Named after the primary engineer or task domain:
  * `Manthan`: AI microservice, LangGraph CRAG, ChromaDB embeddings, BM25 hybrid search.
  * `Rounak`: .NET 8 Enterprise Gateway, ASP.NET Identity, JWT security, EF Core multi-tenancy.
  * `Niyukti`: React frontend architecture, Tailwind CSS design system, PDF.js split-view workstation.
  * `feat/<feature-name>`: Specific cross-functional feature implementations.
  * `fix/<bug-name>`: Urgent hotfixes or issue resolutions.

### 6.2 Commit Message Convention
Commit messages strictly adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```text
<type>(<scope>): <short imperative summary>

[optional body describing technical decisions and architectural context]
```

Standard Types:
* `feat`: A new user-facing feature or API capability.
* `fix`: A bug fix or defect remediation.
* `docs`: Documentation modifications (e.g., updating this README).
* `refactor`: Code modification that neither fixes a bug nor adds a feature.
* `test`: Adding or updating test suites.
* `chore`: Build tooling, dependency upgrades, or configuration adjustments.

Examples:
* `feat(ui): develop responsive multi-portal layouts with role-based access routing`
* `feat(workspace): integrate PDF.js split-view canvas with multi-page navigation`
* `feat(api): initialize .NET gateway with secure middleware and JWT multi-tenant auth`
* `feat(ai): implement BM25 sparse indexing and Reciprocal Rank Fusion logic`

### 6.3 Pull Request (PR) Review Process
Every Pull Request targeting `main` must fulfill the following criteria prior to merging:
1. **Automated Verification**:
   * .NET backend builds without warnings or errors (`dotnet build --configuration Release`).
   * Python AI microservice passes linting and test evaluations (`flake8`, `pytest`).
   * Frontend passes production asset compilation (`npm run build`).
2. **Security and Multi-Tenancy Review**:
   * Verify that every new database query respects tenant boundary filters.
   * Verify that endpoints are protected by appropriate `[Authorize(Roles = "...")]` attributes.
3. **Review Approval**: Requires at least one review approval from a peer module owner.

### 6.4 Coding Standards
* **C# / .NET**: Follow Microsoft C# Coding Conventions. Code must use file-scoped namespaces, nullable reference types (`#nullable enable`), RFC 7807 problem details for exceptions, and XML documentation comments on all public interfaces and controllers.
* **Python**: Adhere to PEP 8 standards. Use strict Pydantic models for request/response schemas. Avoid blocking synchronous calls within asynchronous FastAPI route handlers.
* **React / JavaScript**: Use modern functional components with React Hooks. Write JSDoc comments for all exported components and utility methods. Maintain strict separation of presentation and business logic.
* **Constraint**: Strictly avoid emojis across all source code, comments, commit messages, and documentation.

---

## 7. Institutional Credits and Repository Information

### Institution Details
* **Institution**: Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT), Jaipur
* **Department**: Department of Computer Science & Engineering
* **Program**: Bachelor of Technology (B.Tech) - Computer Science & Engineering
* **Batch**: 2023 - 2027
* **Project Group ID**: Group 18

### Engineering Ownership
* **Manthan Maheshwari**: Lead AI / ML Systems Engineer
  * LangGraph Corrective RAG (CRAG) state machine architecture.
  * ChromaDB dense vector indexing and Rank-BM25 sparse search pipeline.
  * Reciprocal Rank Fusion (RRF) re-ranking algorithms and Ollama DeepSeek-R1 integration.
* **Rounak Varecha**: Lead Backend & Infrastructure Engineer
  * .NET 8 Web API Enterprise Gateway design and middleware pipeline.
  * ASP.NET Identity, multi-tenant JWT claims issuance, token rotation, and rate limiting.
  * Entity Framework Core global query filtering, database schema, and RabbitMQ message broker.
* **Niyukti Singh Janu**: Lead Frontend & UI/UX Engineer
  * React 18 multi-portal layout system and enterprise design system.
  * PDF.js canvas split-view viewer, multi-page smooth scrolling, and search bounding box overlay.
  * Client-side role-based routing guards, access restriction views, and state management.
