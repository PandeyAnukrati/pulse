# Architecture Diagram

This document details the high-level system components and communication channels inside the Aether collaborative workspace monorepo.

## System Topology

```mermaid
graph TD
    Client[Next.js 15 Client Frontend]
    Gateway[NestJS API Gateway]
    Auth[Auth Module]
    Workspace[Workspace Module]
    Collab[Collaboration Module / WS Gateway]
    AI[AI Module]
    DB[(PostgreSQL Database)]
    Redis[(Redis Pub/Sub & Store)]
    Storage[Local uploads static serving]

    Client -->|REST requests| Gateway
    Client -->|WebSockets connection| Collab
    Gateway --> Auth
    Gateway --> Workspace
    Gateway --> Collab
    Gateway --> AI
    Collab -->|Sync states & Cursors| Redis
    Collab -->|Sync canvas events & logs| DB
    Workspace -->|Queries| DB
    Auth -->|Credentials verify| DB
    AI -->|Fetch model prompts| Gemini[Google Gemini API]
    Gateway -->|Static upload serving| Storage
```

## Description of Channels

1. **REST APIs**: Used for landing operations, registers, login verification, listing workspaces, listing comment threads, loading snapshots, and uploading files.
2. **WebSocket Channels**: Live connection layer on port `3001` mapping cursors, typing changes, selection markers, Yjs conflict resolution messages, and canvas mutations in real-time.
3. **Redis Store**: Tracks live socket user connections, handles WebSocket event broadcasts across gateway channels, and caches ephemeral user positions.
4. **PostgreSQL Database**: Persistent storage for all entities, organization keys, canvas event history tables, versions updates, and notifications logs.
