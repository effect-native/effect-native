# crsql-mesh-integration — Phase 1: Instructions

## Context

The `@effect-native/crsql` package already provides CR-SQLite operations through an Effect service layer. It wraps CR-SQLite functions like `crsql_site_id()`, `crsql_db_version()`, and exposes helpers like `pullChanges` and `applyChanges` that work with the `crsql_changes` virtual table.

The upcoming global mesh architecture introduces a new package (`@effect-native/crsql-mesh-core`) that implements the sync engine: anti-entropy loops, version vector tracking, and peer coordination. This sync engine needs to read and write change data from local CR-SQLite databases.

Currently, the `@effect-native/crsql` package has working `pullChanges` and `applyChanges` methods, but they were designed for direct use in application code rather than integration with a sync engine. The sync engine has specific needs:

- **Streaming**: Large change sets should be processable incrementally rather than loading everything into memory
- **Cursor Management**: The engine needs to track synchronization progress per peer precisely
- **Batch Operations**: Applying changes from multiple sources efficiently
- **Integration Hooks**: The engine needs to observe when local changes occur to trigger sync

There is a design question: where should these capabilities live?

- **Option A**: Add them to `@effect-native/crsql` — keeps all database operations in one place
- **Option B**: Create new capabilities in `@effect-native/crsql-mesh-core` — keeps sync concerns separate
- **Option C**: Split — foundational primitives in `@effect-native/crsql`, orchestration in mesh-core

The existing package should remain usable standalone without mesh dependencies. Developers who only need CR-SQLite without peer sync should not be forced to pull in mesh code.

## User Story

As a sync engine developer building `@effect-native/crsql-mesh-core`,

I want typed helpers in `@effect-native/crsql` that let me efficiently pull ordered changes and apply incoming change batches,

So that I can implement anti-entropy synchronization without reimplementing low-level database interactions or breaking existing users of the crsql package.

## High-Level Goals

### For the Existing `@effect-native/crsql` Package

- Provide typed access to `crsql_changes` data in a format suitable for both direct use and sync engine consumption
- Support efficient retrieval of changes with proper ordering guarantees (by `db_version`, then `seq`)
- Support efficient application of incoming change batches with transaction safety
- Expose helpers that compose naturally with Effect SQL clients and Effect streams
- Maintain backward compatibility — existing `pullChanges` and `applyChanges` APIs continue to work unchanged
- Keep the package usable standalone without requiring mesh dependencies

### For Integration with the Sync Engine

- Enable the sync engine to pull changes incrementally (streaming rather than all-at-once when needed)
- Provide precise cursor tracking (version + sequence) for resumable sync
- Support applying changes with proper validation and error handling
- Allow the sync engine to observe local database mutations (for triggering outbound sync)

### Package Boundary Principles

The split between `@effect-native/crsql` and `@effect-native/crsql-mesh-core` should follow these principles:

- **`@effect-native/crsql`**: Database primitives. Reading and writing data. Schema operations. Single-node operations. No awareness of peers or network.

- **`@effect-native/crsql-mesh-core`**: Sync orchestration. Version vector management. Peer tracking. Anti-entropy loops. Multi-peer coordination. Depends on crsql for database access.

The integration points are:
- Typed change row structures (schema definition)
- Change retrieval helpers (pull from local database)
- Change application helpers (apply to local database)
- Cursor/version accessors (track sync progress)

## Out of Scope

This spec covers only the integration surface between the crsql package and the mesh core. The following are explicitly NOT part of this spec:

- **Sync Engine Logic**: Anti-entropy algorithms, version vector comparison, diff computation. That belongs in mesh-core.

- **Protocol Messages**: Wire format, message types, encoding. That belongs in crsql-mesh-protocol.

- **Transport Concerns**: WebSocket, WebRTC, BroadcastChannel. Those are separate transport packages.

- **Peer Discovery**: How peers find each other. That is transport-dependent.

- **Authentication and Authorization**: Trust establishment, access control.

- **Encryption**: Wire-level or application-level encryption.

- **Reactivity Integration**: While the crsql package may eventually integrate with a reactivity system for live queries, that is a separate spec.

- **Schema Inference from Changes**: The experimental `__experimental__schemaFromChanges` feature is already in crsql and not part of this mesh integration.

- **New Package Creation**: This spec is about changes to the existing crsql package, not about creating crsql-mesh-core.

## Questions for Design Phase

1. Should streaming change access be exposed as Effect Streams, or should the existing array-based API be sufficient for the sync engine?

2. Should cursor tracking (per-peer versions) be enhanced beyond the existing `setPeerVersion`/`getPeerVersion` helpers?

3. What validation should occur during `applyChanges` beyond what CR-SQLite does internally?

4. How should local mutation observation work — should crsql emit events, or should the sync engine poll?

## References

- Existing crsql package: [`packages-native/crsql/`](../../packages-native/crsql/)
- Existing crsql service: [`packages-native/crsql/src/CrSql.ts`](../../packages-native/crsql/src/CrSql.ts)
- Parent package map: [`crsqlite-global-mesh-packages/instructions.md`](../crsqlite-global-mesh-packages/instructions.md)
- Protocol spec: [`crsql-mesh-protocol/instructions.md`](../crsql-mesh-protocol/instructions.md)
