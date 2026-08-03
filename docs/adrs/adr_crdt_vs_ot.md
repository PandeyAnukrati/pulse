# Architecture Decision Record: CRDT vs Operational Transformation

## Context and Problem Statement
Aether requires high-fidelity, real-time drawing and annotation editing across multiple concurrent users on an infinite whiteboard canvas. Edits must merge automatically without conflicts or central server bottlenecks.

We considered two collaborative sync paradigms:
1. **Operational Transformation (OT)** (used by Google Docs).
2. **Conflict-Free Replicated Data Types (CRDT)** (used by Figma/Yjs).

## Decision
We chose **CRDT (specifically Yjs)** for distributed state synchronization.

## Rationale
1. **Decentralized Merges**: CRDTs resolve conflicts mathematically using state vectors, meaning merges can happen on any client without requiring an active coordinator server.
2. **Offline-First Support**: Yjs allows offline clients to register updates locally and apply delta merges seamlessly when connection recovers.
3. **Fewer Overhead Constraints**: OT requires a strict central authority server to sequence events, which increases latency and introduces complex backend scaling bottlenecks.
