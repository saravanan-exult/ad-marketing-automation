# ADTech Marketing Automation

This repository contains a full-stack marketing automation prototype built to satisfy the interview task requirements.

## Structure

- `backend/`: NestJS backend for file ingestion, validation, AI-assisted suggestions, and reconciliation.
- `frontend/`: React frontend prototype for upload, review, reconciliation, and RAG assistant.

## Architecture & Documentation

- [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md): High-level system architecture, data models, scalability, and non-functional requirements.
- [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md): NestJS backend design, module breakdown, validation engine, and RAG/Temporal workflows.
- [`CICD_STRATEGY.md`](./CICD_STRATEGY.md): End-to-end CI/CD strategy, pipeline Mermaid diagrams, Blue/Green rollout, and rollback mechanics.

## Setup

### Backend

```powershell
cd backend
npm install
npm run start:dev
```

### Frontend

```powershell
cd frontend
npm install
npm start
```

## Notes

The prototype includes:

- CSV upload and schema validation
- Date standardization and duplicate detection
- Business rule checks for region/platform values
- AI-assisted campaign normalization via a simple semantic matcher stub
- RAG assistant endpoint with retrieval from local ingestion logs
- Spend reconciliation against a stubbed Ad platform API
- Review and approval workflow APIs
- **Temporal Workflow Orchestration**: Production-grade orchestration using `@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`, and `@temporalio/activity` with graceful in-memory fallback for zero-config local testing.
- **Docker Compose**: Fully containerized with PostgreSQL (`pgvector`), Redis, Temporal Server, and NestJS Backend.

This is a working baseline. Production readiness is supported by modular architecture, idempotency via file hashes, and clear extension points for LLM, orchestration, and Databricks.
