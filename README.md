# Enterprise Multi-Tenant AI Research Assistant Platform

## Overview
The Enterprise Multi-Tenant AI Research Assistant Platform is a production-grade, multi-modal Retrieval-Augmented Generation (RAG) system. It is designed to eliminate artificial intelligence hallucinations through strict document grounding, visual citations, and self-correcting logic. The platform provides a secure, isolated environment for organizational research and data synthesis.

## System Portals
The platform exposes three distinct user interfaces tailored to specific operational roles:

1. **User Workspace**: A dedicated portal for end-users to interact with the AI assistant, query ingested documents, view visual citations, and utilize split-view document layouts.
2. **Admin Management**: A control center for system administrators to manage tenants, user roles, access control policies, and oversee system health.
3. **Audit Logs**: A compliance and security dashboard detailing system events, document access, API usage, and administrative actions to ensure complete system transparency.

## Technology Stack
The platform is built using a decoupled microservice architecture, leveraging the following technologies:

*   **Frontend**: React.js, Tailwind CSS
*   **Backend (Enterprise Gateway)**: .NET 8 Web API, Entity Framework Core, MS SQL Server
*   **AI Microservice (Inference Engine)**: Python FastAPI, LangGraph, DeepSeek-R1 (via local Ollama), ChromaDB, Rank-BM25
*   **Event Broker**: RabbitMQ

## Setup Instructions
(Note: Detailed microservice-specific instructions will be provided in their respective directories upon implementation.)

### Prerequisites
*   Node.js (v20 or later)
*   .NET 8 SDK
*   Python 3.11+
*   MS SQL Server
*   RabbitMQ
*   Ollama (with DeepSeek-R1 model)

### Initialization Steps
1.  Clone the repository to your local machine.
2.  Navigate to the `/backend-api` directory to configure the .NET Enterprise Gateway and apply database migrations.
3.  Navigate to the `/ai-service` directory to install Python dependencies and initialize the AI Inference Engine.
4.  Navigate to the `/frontend` directory to install NPM packages and start the React application.
5.  Ensure RabbitMQ is running and accessible by both backend and AI services.

Please refer to the `ARCHITECTURE.md` file for an in-depth analysis of the system design and microservice interactions.
