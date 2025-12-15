# crsql-mesh-runtime-node — Phase 2: Requirements

This document covers requirements for `@effect-native/crsql-mesh-runtime-node` only.

## Functional Requirements

### Effect Platform Integration (FR-NODE-001)

The Node Runtime shall depend on `@effect/platform` capabilities for filesystem access and process lifecycle.

### Filesystem Persistence (FR-NODE-002)

**When** creating a Node Runtime layer,
**Then** the Runtime shall accept a configurable database path.

**If** the database path cannot be used for persistence,
**Then** the Runtime shall fail with `DatabasePathInvalid`.

### Database Connection (FR-NODE-003)

**When** opening the database,
**Then** the Runtime shall load the CR-SQLite extension and provide a database connection compatible with `@effect-native/crsql`.

**If** the Protocol reports `UnhexUnavailable`,
**Then** the Runtime shall fail without attempting a fallback.

### Graceful Shutdown (FR-NODE-004)

**When** the process receives SIGTERM or SIGINT,
**Then** the Runtime shall stop the Mesh sync loop and close the database connection within a configurable timeout.

**If** shutdown exceeds the timeout,
**Then** the Runtime shall fail with `ShutdownTimeout`.

### Runtime Layer (FR-NODE-005)

The Node Runtime shall export a `NodeRuntimeLive` layer that provides:
- A filesystem-backed database connection for Mesh
- Process lifecycle hooks needed for shutdown

### Error Types (FR-NODE-006)

The Node Runtime shall define error types:
- `DatabasePathInvalid`
- `ShutdownTimeout`

## Non-Functional Requirements

### NFR-NODE-001: Minimal Dependencies

The Runtime depends only on:
- `@effect/platform`
- `@effect-native/crsql`
- `@effect-native/crsql-mesh`
- `@effect-native/crsql-mesh-protocol`
- `@effect-native/crsql-mesh-transport`

## Constraints

### C-NODE-001: Node.js Version

Requires Node.js 18+.

## Out of Scope

Aligned with Phase 1 runtime instructions:
- Browser and React Native runtimes
- Worker Thread / multi-thread coordination
- Cluster mode (multi-process)
- Bun-specific behavior guarantees
