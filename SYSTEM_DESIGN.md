# System Design: Marketing Automation & AI Platform

## Architecture Overview

The platform follows a modular architecture:

- **Client**: React SPA for workflow management (upload, review, dashboard).
- **Backend**: NestJS REST API orchestrating ingestion and processing.
- **Data Layer**:
  - File storage for raw and cleaned datasets.
  - Audit logs and ingestion history stored in memory (extensible to PostgreSQL/PGVector for RAG).
- **AI/ML**: Semantic matcher for campaign normalization; RAG assistant for ingestion insights.

## Scalability & Reliability

- **Scalability**: Stateless backend allows horizontal scaling. Jobs are processed asynchronously with idempotency keys (file hash + date) to prevent duplicate processing.
- **Reliability**: Partial failure handling via individual record status tracking. Extensible with Temporal for complex workflow orchestration.

## CI/CD Pipeline Design

- **Build**: Dockerized microservices (frontend + backend).
- **Testing**: Jest unit tests for validation engine; Integration tests for ingestion flow.
- **Deployment**: Rolling updates in Kubernetes (K8s). Rollback strategy via image tag revert.
- **Security**: RBAC for uploader/approver roles; Secrets management via Vault.

## Trade-offs

- **In-Memory Store**: Used for prototyping speed. Production should switch to Redis/PostgreSQL.
- **Local RAG Stub**: Uses simple keyword/similarity matching. Should be replaced with OpenAI/LangChain for production.
