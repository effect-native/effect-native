# crsql-mesh-runtime-node — Phase 2: Requirements

This document covers requirements for `@effect-native/crsql-mesh-runtime-node` only. Browser and React Native runtimes are out of scope for Phase 1.

## Functional Requirements

### Effect Platform Integration (FR-NODE-001)

The Node Runtime shall depend on `@effect/platform` for:
- Filesystem operations (database path resolution, file existence checks)
- Process lifecycle (SIGTERM/SIGINT handling)

### Filesystem Persistence (FR-NODE-002)

**When** creating a Node Runtime layer,
**Then** the Runtime shall accept a configurable database path (absolute or relative to cwd).

**If** the database path's parent directory does not exist,
**Then** the Runtime shall fail with `DatabasePathInvalid` error (no auto-creation of parent directories).

### Database Connection (FR-NODE-003)

The Node Runtime shall provide a database connection layer compatible with `@effect-native/crsql`:
- Loading the CR-SQLite extension
- Verifying `unhex()` availability (delegating to Protocol's `UnhexUnavailable` check)

### Graceful Shutdown (FR-NODE-004)

**When** the process receives SIGTERM or SIGINT,
**Then** the Runtime shall:
1. Signal the Mesh to stop the anti-entropy loop
2. Wait for in-flight transactions to complete (with timeout)
3. Close the database connection

### Worker Thread Support (FR-NODE-005)

**Where** the Runtime is used in a multi-threaded context,
**Then** the Runtime shall support Worker Thread coordination:
- Single-writer semantics (one writer thread at a time)
- SQLite WAL mode for concurrent reads

### Runtime Layer (FR-NODE-006)

The Node Runtime shall export a `NodeRuntimeLive` layer that provides:
- Database connection (satisfying Mesh requirements)
- Filesystem-backed persistence
- Process lifecycle hooks

### Default Configuration (FR-NODE-007)

The Node Runtime shall provide sensible defaults:
- Database location: `./data/mesh.db` (relative to process cwd)
- Sync interval: 1000ms
- Shutdown timeout: 5000ms

**Where** custom configuration is provided,
**Then** the Runtime shall use the provided values.

### Error Types (FR-NODE-008)

The Node Runtime shall define error types:
- `DatabasePathInvalid`: database path is invalid or parent directory missing
- `ShutdownTimeout`: graceful shutdown exceeded timeout
- `WorkerCoordinationFailed`: worker thread coordination failed

### Bun Compatibility (FR-NODE-009)

**Where** the Runtime is executed under Bun,
**Then** the Runtime shall function identically to Node.js (using shared `@effect/platform` abstractions).

## Non-Functional Requirements

### NFR-NODE-001: Platform Detection
The Runtime uses `@effect/platform-node` for Node.js and relies on Bun's Node compatibility layer. No runtime environment sniffing in application code.

### NFR-NODE-002: Minimal Dependencies
The Runtime depends only on:
- `@effect/platform` / `@effect/platform-node`
- `@effect-native/crsql`
- `@effect-native/crsql-mesh`
- `@effect-native/crsql-mesh-protocol`
- `@effect-native/crsql-mesh-transport`

No additional native modules beyond what `@effect-native/crsql` requires.

## Constraints

### C-NODE-001: Node.js Version
Requires Node.js 18+ or Bun with Node.js compatibility.

### C-NODE-002: SQLite Native Binding
Relies on native SQLite binding provided by `@effect-native/crsql` (e.g., better-sqlite3 or op-sqlite).

### C-NODE-003: No Cluster Mode
Cluster mode (multi-process load balancing) is out of scope for Phase 1.

## Out of Scope

Aligned with Phase 1 runtime instructions:
- Browser runtime (`@effect-native/crsql-mesh-runtime-browser`)
- React Native runtime (`@effect-native/crsql-mesh-runtime-react-native`)
- Electron runtime (explicitly out of scope per Tom's decision)
- Transport implementations (separate packages)
- Authentication and authorization
- Inter-process coordination via Unix domain sockets or TCP
- Cluster mode support
