# SYSTEM DESIGN: Node.js v24.11.0 Enterprise Architecture & MVC Restructuring

## Executive Summary

This document outlines the architectural upgrades, MVC restructuring, memory leak mitigation, and Node.js v24.11.0 modernizations applied to the Ad Tech Marketing Ingestion backend.

---

## 1. Architectural Review & MVC Restructuring

### Previous State

- The backend was structured around NestJS modules, controllers, and services without a dedicated model/data-access domain layer (`ingestion.service.ts` handled both in-memory state management and business logic).

### Restructuring Improvements

- **Model Layer (`models/ingestion.model.ts`)**: Introduced explicit data interfaces (`IngestionJob`, `IngestionSchedule`, `CampaignRecord`) and a dedicated `IngestionModel` provider to manage in-memory collections (`Map`, `Set`, arrays) with bounded capacity caps.
- **Controller Layer (`ingestion.controller.ts`)**: Pure HTTP transport layer handling request mapping, input validation decorators, and response serialization.
- **Service Layer (`ingestion.service.ts`, `validation.service.ts`, `reconciliation.service.ts`, `assistant.service.ts`)**: Pure business logic, validation rules, reconciliation algorithms, and AI vector assistant integrations.

---

## 2. Memory Leak & Resource Management Audit

### Confirmed Risks & Fixes

1. **Unbounded In-Memory Collections (`jobs`, `history`, `uploadedHashes`, `documents`)**:
   - _Risk_: Without limits, continuous file uploads would lead to unbounded memory consumption and eventual Out-Of-Memory (OOM) crashes in production.
   - _Fix_: Implemented strict capacity limits (`MAX_JOBS = 500`, `MAX_HISTORY = 500`, `MAX_SCHEDULES = 100`, hash set trimming, vector document queue bounds).
2. **File System Stream & Handle Leaks**:
   - _Risk_: Unclosed file handles during CSV/Excel multipart parsing or audit log writing.
   - _Fix_: Used atomic `fs.promises` operations with proper `try...catch` blocks and automatic resource reclamation.

---

## 3. Node.js v24.11.0 Compatibility & Modernization

- **Engine Pinning**: Updated `backend/package.json` with `"engines": { "node": ">=24.11.0" }`.
- **Dockerfile Update**: Migrated multi-stage Docker build images from `node:20-alpine` to `node:24.11.0-alpine`.
- **TypeScript & Dependency Upgrades**: Upgraded TypeScript to `^5.7.2`, `@types/node` to `^22.10.2`, NestJS packages to `^10.4.15`, and OpenAI SDK to `^4.77.0`.

---

## 4. Verification & Testing

- Unit and end-to-end tests successfully compiled and passed under Node.js v24.11.0 runtime environment.
