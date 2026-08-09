# System Design: Marketing Automation & AI Platform

## Architecture Overview

The platform follows a production-ready modular architecture:

- **Client**: React SPA for workflow management (upload, review, dashboard).
- **Backend**: NestJS REST API orchestrating ingestion, validation, reconciliation, and AI workflows.
- **Data & Vector Layer**:
  - File storage for raw datasets and JSON audit trails.
  - PostgreSQL with `pgvector` extension for vector embeddings (`text-embedding-3-small`) and RAG similarity search.
- **AI/ML Integration**:
  - OpenAI API (`gpt-4o-mini` and embeddings) for intelligent RAG assistant answers and citation generation.
  - Semantic campaign name normalization with fallback heuristic rules.

## Scalability & Reliability

- **Scalability**: Stateless NestJS backend containerized for horizontal auto-scaling behind load balancers. Idempotency checks via SHA-256 file hashing prevent duplicate runs.
- **Reliability**: Exponential backoff retry strategies for external LLM and Ad platform APIs, dead-letter queue patterns, and persistent audit logs on disk.

## Infrastructure & CI/CD Pipeline

- **Containerization**: Multi-stage production `Dockerfile` and `docker-compose.yml` orchestrating Backend, PostgreSQL + PGVector, and Redis.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci-cd.yml`) executing automated backend tests, security audits, frontend builds, and Docker image packaging.
- **Detailed Design**: Comprehensive architecture, blue/green rollout strategies, rollback mechanics, and stage-by-stage breakdowns are documented in [`CICD_STRATEGY.md`](./CICD_STRATEGY.md).

## Trade-offs & Production Evolution

- **In-Memory & Local Storage vs Distributed Cloud**: Local disk/memory used for out-of-the-box zero-config execution; easily switchable to AWS S3 / Azure Blob Storage and managed PostgreSQL RDS.
- **Embedding Cache**: In-memory vector index augmented with PGVector persistence for high-throughput enterprise scale.
