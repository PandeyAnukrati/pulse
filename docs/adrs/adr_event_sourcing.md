# Architecture Decision Record: Event-Sourced Whiteboard Actions

## Context and Problem Statement
To support version history, visual audit feeds, and time-travel replay scrubbing, we need a complete trace of all actions performed on the whiteboard (e.g. who moved a node, when an element was deleted, and by whom).

## Decision
We implemented a hybrid **Event Sourcing** approach where every canvas mutation is captured as an event, pushed to the server over WebSockets, and logged to the PostgreSQL database with an incremental sequence number.

## Rationale
1. **Time Travel Timeline**: Storing atomic canvas actions (`CREATE_NODE`, `MOVE_NODE`, `DELETE_NODE`) allows the client timeline scrub slider to replay board layout states from step `0` to `N` inside a local reducer.
2. **Audit Trails**: Simplifies tracking collaboration activity. Organizations can audit mutations, review authors, and undo/redo operations.
3. **Decoupled State**: The event log runs alongside the active CRDT doc state, keeping Yjs memory compact while preserving complete historical checkpoints.
