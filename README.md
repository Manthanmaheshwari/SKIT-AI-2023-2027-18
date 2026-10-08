# Enterprise Multi-Tenant AI Research Assistant Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

## Project Overview & Portals

This repository contains the source code for a production-grade, multi-modal Retrieval-Augmented Generation (RAG) platform. The system is engineered to eliminate AI hallucinations through strict document grounding, visual citations, and self-correcting logic loops, operating securely within a multi-tenant enterprise environment.

The platform is divided into three distinct, role-based portals:
*   **User Workspace:** An interactive, split-view React interface featuring a PDF.js canvas that draws glowing bounding boxes directly over cited source text, alongside a real-time AI chat interface.
*   **Admin Dashboard:** A centralized management console for configuring multi-tenancy, assigning JSON Web Token (JWT) role claims (RBAC), and establishing global query filters.
*   **Audit Dashboard:** A dark-mode compliance tracking center displaying immutable security logs, system health metrics, and OpenTelemetry distributed tracing data.

## Architecture & Tech Stack

The system implements a decoupled microservice architecture to ensure high availability, logical data isolation, and asynchronous processing.

*   **Frontend (Client Layer):** React.js, Tailwind CSS, Vite, PDF.js, and SignalR for bi-directional WebSocket streaming.
*   **Backend (Enterprise Gateway):** .NET 8 Web API enforcing JWT authentication, Role-Based Access Control (RBAC), and API routing.
*   **Relational Database:** MS SQL Server utilizing Entity Framework Core and Global Query Filters to enforce strict multi-tenant data isolation.
*   **AI Microservice (Inference Engine):** Python 3.11, FastAPI, and LangGraph for Corrective RAG (CRAG) state-machine execution.
*   **Local Inference:** Ollama hosting the DeepSeek-R1 model on-premise to guarantee zero enterprise data leakage.
*   **Hybrid Search Engine:** ChromaDB for dense semantic vector embeddings merged with Rank-BM25 for sparse keyword indexing, utilizing Reciprocal Rank Fusion (RRF).
*   **Event Broker:** RabbitMQ to queue heavy, asynchronous document ingestion workloads.

## Core Features

*   **Zero-Hallucination Visual Citation:** The AI returns specific chunk metadata, prompting the frontend to draw bounding boxes over the exact source sentences on the original document.
*   **Self-Correcting RAG (CRAG):** LangGraph nodes evaluate retrieved contextual relevance. If chunks are irrelevant, the system autonomously rewrites the search query and re-retrieves before generating a response.
*   **Universal Multimodal Ingestion:** Pipeline capable of parsing standard text documents, PDFs, and media transcripts (via FFmpeg/Whisper).
*   **Isolated Math Execution:** Mathematical and analytical queries bypass standard generation and are routed to a secure, isolated Python code-execution sandbox to compute verified proofs.
*   **Asynchronous Processing:** Large document uploads do not block the web thread. RabbitMQ manages the ingestion queue while SignalR streams real-time progress bars to the user interface.

## Getting Started (Local Development)

### Prerequisites
*   Node.js (v18+)
*   .NET 8 SDK
*   Python (3.11+)
*   Docker & Docker Compose (for RabbitMQ and MS SQL Server)
*   Ollama (with DeepSeek-R1 model pulled locally)

### Initial Setup
1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Manthanmaheshwari/SKIT-AI-2023-2027-18.git](https://github.com/Manthanmaheshwari/SKIT-AI-2023-2027-18.git)
    cd SKIT-AI-2023-2027-18
    ```
2.  **Environment Configuration:**
    Duplicate the `.env.example` files in the `/frontend`, `/backend`, and `/ai-service` directories and rename them to `.env`. Configure your local database connection strings and secret keys.
3.  **Start Infrastructure Services:**
    ```bash
    docker-compose up -d
    ```
    *This initializes RabbitMQ, ChromaDB, and the MS SQL Server instances.*
4.  **Run Migrations:**
    Navigate to the `.NET` backend directory and apply the Entity Framework migrations to build the SQL schema.
    ```bash
    dotnet ef database update
    ```
5.  **Initialize Microservices:**
    *   **Frontend:** `npm install` followed by `npm run dev`
    *   **Backend:** `dotnet run`
    *   **AI Service:** `pip install -r requirements.txt` followed by `uvicorn main:app --reload`

**Development Note for Contributors:** 
This repository utilizes automated GitHub Actions for academic progress tracking. All commits must be granular and descriptive. Ensure you push your branch merges to `main` before Thursday at 11:59 PM IST for inclusion in the automated Form-3 weekly report.
