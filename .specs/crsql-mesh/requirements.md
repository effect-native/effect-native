# crsql-mesh — Unified Requirements

This document consolidates all mesh-related requirements: anti-entropy engine, protocol, transport, runtime adapters, and browser multi-tab coordination.

---

## 1. Mesh Engine Requirements

### Anti-Entropy Loop (FR-MESH-001)

**When** the Mesh is connected to a peer and the sync loop is running,
**Then** the Mesh shall exchange `VersionSummary` and transfer missing change rows until no missing rows remain for that peer.

### Version Vector Management (FR-MESH-002)

The Mesh shall maintain an in-memory version vector:
- Tracking the highest `db_version` seen from each `SiteIdHex`
- Updated after successfully applying incoming change batches
- Queryable by callers to observe sync progress

### Change Pull (FR-MESH-003)

**When** a peer sends a `DiffRequest`,
**Then** the Mesh shall compute which change rows the requester is missing (from the requester's `VersionSummary`) and respond with up to the requested batch size.

### Change Apply (FR-MESH-004)

**When** receiving a `DiffResponse`,
**Then** the Mesh shall apply changes within a SQLite transaction using `crsql_changes` INSERT.

**If** any change fails to apply,
**Then** the Mesh shall roll back the transaction and emit `ApplyFailed` error.

### Idempotent Application (FR-MESH-005)

**When** the same change batch is applied multiple times,
**Then** the Mesh shall produce the same database state (idempotent).

### Local Write Passthrough (FR-MESH-006)

The Mesh shall not block or intercept local writes. Applications write directly to SQLite; the Mesh only observes and propagates changes.

### DB Version Observation (FR-MESH-007)

The Mesh shall provide a way for callers to observe when local `db_version` advances ("db changed, re-query").

### Error Types (FR-MESH-008)

The Mesh shall define error types:
- `ApplyFailed`: change application failed (with underlying cause)
- `ProtocolError`: invalid or malformed message received
- `SyncInterrupted`: sync loop was interrupted (transport closed, shutdown)

### Effect Service Definition (FR-MESH-009)

The Mesh shall be defined as an Effect `Context.Tag` service with:
- A `MeshLive` layer requiring transport and database connection
- Configurable sync interval

---

## 2. Protocol Requirements

### Schema Reuse (FR-PROTO-001)

**When** defining protocol message types,
**Then** the Protocol shall reuse schemas from CrSqlSchema:
- `ChangeRowSerialized` for change row payloads
- `ChangeArray` for tuple-form payloads
- `SiteIdHex` for peer identifiers
- `VersionString` for version fields
- `TrackedPeerSerialized` for version vector entries

### unhex() Availability Check (FR-PROTO-002)

**When** creating a Protocol layer,
**Then** the Protocol shall verify SQLite `unhex()` is available by executing a test query.

**If** `unhex()` is unavailable or disabled,
**Then** the Protocol shall fail immediately with `UnhexUnavailable` error (no fallback).

### Version Vector Summary (FR-PROTO-003)

The Protocol shall define a `VersionSummary` message containing:
- A map of `SiteIdHex` to `VersionString` representing the highest `db_version` seen from each site
- The local site's own `SiteIdHex`

### Diff Request (FR-PROTO-004)

The Protocol shall define a `DiffRequest` message containing:
- The requester's `VersionSummary`
- An optional maximum batch size (number of change rows)

### Diff Response (FR-PROTO-005)

The Protocol shall define a `DiffResponse` message containing:
- An array of `ChangeRowSerialized` rows
- A boolean indicating whether more changes remain beyond this batch
- The sender's current `VersionSummary` after the batch

### Message Envelope (FR-PROTO-006)

The Protocol shall define a `MeshMessage` envelope containing:
- A discriminated union of: `VersionSummary`, `DiffRequest`, `DiffResponse`
- A monotonic message sequence number (for deduplication)
- The sender's `SiteIdHex`

### Effect Schema Encoding (FR-PROTO-007)

The Protocol shall provide Effect Schema definitions for all message types, enabling:
- Encoding and decoding of messages
- Runtime validation of incoming messages

---

## 3. Transport Requirements

### Transport Interface (FR-TRANS-001)

The Transport shall define a minimal interface with:
- A `send` operation accepting a peer identifier and opaque byte payload
- A `receive` stream emitting incoming messages with sender identifier

### In-Memory Transport (FR-TRANS-002)

The Transport shall provide an `InMemoryTransport` implementation that:
- Connects peers within the same process without network I/O
- Supports deterministic message ordering for testing
- Enables two-peer sync loops without external dependencies

### Peer Addressing (FR-TRANS-003)

**When** addressing a peer,
**Then** the Transport shall accept `SiteIdHex` as the peer identifier type.

### Message Delivery Semantics (FR-TRANS-004)

The Transport interface shall not require any delivery guarantees (ordering, retries, or persistence).

**When** delivery guarantees are needed,
**Then** callers (such as Mesh) shall implement them above the Transport.

### Transport Lifecycle (FR-TRANS-005)

The Transport shall define lifecycle operations:
- `open`: establish the transport (connect, bind, etc.)
- `close`: tear down the transport (disconnect, unbind, etc.)

**When** the Transport is closed,
**Then** subsequent operations shall fail with `TransportClosed`.

### Transport Errors (FR-TRANS-006)

The Transport shall define error types:
- `TransportClosed`: operation attempted on closed transport
- `PeerUnreachable`: target peer cannot be reached
- `SendFailed`: generic send failure with underlying cause

### Effect Service Definition (FR-TRANS-007)

The Transport shall be defined as an Effect `Context.Tag` service, enabling:
- Layer-based dependency injection
- Swappable implementations (in-memory for tests, real transports for production)

---

## 4. Runtime Adapter Requirements

### Effect Platform Integration (FR-RUNTIME-001)

**Where** a Node.js runtime is included,
**Then** the Runtime shall depend on `@effect/platform` capabilities for filesystem access and process lifecycle.

### Filesystem Persistence (FR-RUNTIME-002)

**When** creating a runtime layer,
**Then** the Runtime shall accept a configurable database path.

**If** the database path cannot be used for persistence,
**Then** the Runtime shall fail with `DatabasePathInvalid`.

### Database Connection (FR-RUNTIME-003)

**When** opening the database,
**Then** the Runtime shall load the CR-SQLite extension and provide a database connection compatible with CrSql.

**If** the Protocol reports `UnhexUnavailable`,
**Then** the Runtime shall fail without attempting a fallback.

### Graceful Shutdown (FR-RUNTIME-004)

**When** the process receives SIGTERM or SIGINT,
**Then** the Runtime shall stop the Mesh sync loop and close the database connection within a configurable timeout.

**If** shutdown exceeds the timeout,
**Then** the Runtime shall fail with `ShutdownTimeout`.

### Runtime Layer (FR-RUNTIME-005)

The Runtime shall export a layer that provides:
- A filesystem-backed database connection for Mesh
- Process lifecycle hooks needed for shutdown

### Runtime Error Types (FR-RUNTIME-006)

The Runtime shall define error types:
- `DatabasePathInvalid`
- `ShutdownTimeout`

---

## 5. Browser Multi-Tab Requirements

These requirements enable a single OPFS-backed SQLite+CR-SQLite database to be safely used from multiple browser tabs without corruption and without requiring COOP/COEP headers.

### Single Provider Architecture (FR-MULTITAB-001)

The Browser Runtime shall ensure only one provider tab's dedicated Worker owns the OPFS database connection at any time.

### Coordinator Role (FR-MULTITAB-002)

**Where** SharedWorker is available,
**Then** the Browser Runtime shall use a SharedWorker as the coordinator for provider election and message routing.

**Where** SharedWorker is unavailable,
**Then** the Browser Runtime shall fall back to a Service Worker as the coordinator.

### No Cross-Origin Isolation Requirement (FR-MULTITAB-003)

The Browser Runtime shall not require COOP/COEP headers for multi-tab operation.

### Provider Election (FR-MULTITAB-004)

**When** multiple tabs connect to the same database,
**Then** the coordinator shall elect exactly one tab as the provider using Web Locks with lock name `crsqlite:provider:<dbName>`.

### Provider Death Detection (FR-MULTITAB-005)

**When** the provider tab closes or crashes,
**Then** the coordinator shall detect the disconnection and trigger re-election of a new provider.

### Client Re-Election Continuity (FR-MULTITAB-006)

**When** a new provider is elected after provider death,
**Then** client tabs shall automatically reconnect and resume operations without manual intervention.

### OPFS Ownership (FR-MULTITAB-007)

The provider tab's dedicated Worker shall be the only process that accesses OPFS for the database. Client tabs interact exclusively through the coordinator.

### DB Version Notifications (FR-MULTITAB-008)

**When** the provider executes a write that advances `db_version`,
**Then** the provider shall broadcast `{ dbName, dbVersion }` through the coordinator to all connected client tabs.

### Client Liveness Detection (FR-MULTITAB-009)

**When** a client tab closes,
**Then** the coordinator shall detect the disconnection and release associated resources (subscriptions, ports).

### Idempotent Write Guard (FR-MULTITAB-010)

**Where** write operations may be interrupted by provider death,
**Then** the provider shall support an optional `txId` parameter for idempotent retry semantics using a guard table.

### RPC Interface (FR-MULTITAB-011)

The Browser Runtime shall expose an RPC interface with at minimum:
- `open({ dbName, vfs, flags })`
- `exec({ sql, bind?, tx?, txId? })`
- `query({ sql, bind? }) -> rows`

### Serial Execution (FR-MULTITAB-012)

The provider shall process requests on a single queue to avoid overlapping transactions and reentrancy issues.

---

## Non-Functional Requirements

### NFR-001: Eventual Consistency

All replicas participating in the mesh eventually converge. No upper time bound on convergence.

### NFR-002: No Global Ordering

Changes are causally ordered per-site but have no total global order.

### NFR-003: Resilient to Duplicates

Duplicate messages and duplicate change batches are handled gracefully (idempotent).

### NFR-004: Transport Agnostic Protocol

Message types are transport-agnostic byte payloads. The Protocol does not reference WebSocket, HTTP, or any transport mechanism.

### NFR-005: Minimal New Types

The Protocol introduces only types necessary for mesh coordination that do not already exist in CrSql.

### NFR-006: Zero External Dependencies for Test Transport

The `InMemoryTransport` has no dependencies on network libraries or platform APIs.

### NFR-007: No SharedArrayBuffer Requirement

The Browser Runtime shall use OPFS VFS options (such as `opfs-sahpool`) that do not require SharedArrayBuffer, avoiding COOP/COEP requirements.

---

## Constraints

### C-001: CR-SQLite Merge Semantics

Uses CR-SQLite's built-in last-write-wins merge. No custom conflict resolution.

### C-002: No Persistent Sync State

Version vectors are in-memory during a session. Persistence across restarts is a caller concern.

### C-003: unhex() Required

Requires a SQLite build that provides `unhex()`.

### C-004: Schema-First Serialization

All serialization uses Effect Schema. No hand-rolled JSON parsing or binary protocols.

### C-005: No Built-in Discovery

Peer discovery is out of scope. Transports assume callers know which peers to address.

### C-006: No Built-in Encryption

Security is handled at the transport implementation level or by wrapping transports, not in the interface.

### C-007: Node.js 18+

Node runtime requires Node.js 18+.

### C-008: Single OPFS Instance Per Database

Only one active OPFS connection per origin+directory. The provider architecture makes this a feature.

---

## Out of Scope

Aligned with Phase 1 / MVP instructions:

- Specific transport implementations (WebSocket, WebRTC, IPC, etc.) beyond InMemoryTransport
- Global uniqueness guarantees (application generates UUIDs)
- Linearizable reads
- Authentication and authorization
- Schema migration coordination
- Conflict resolution customization
- Snapshot bootstrapping for new peers
- Compaction and garbage collection
- Peer discovery and membership
- Encryption at the interface level (use transport-layer TLS if needed)
- Message framing (transport's responsibility)
- Connection management (reconnection, keepalives)
- Routing and relay logic
- Bandwidth management and QoS
- Browser and React Native runtimes (beyond multi-tab browser)
- Worker Thread / multi-thread coordination for Node
- Cluster mode (multi-process)
- Bun-specific behavior guarantees
- True concurrent multi-connection reads in browser
- Running DB service in SharedWorker itself (blocked by lack of sync OPFS handles)
- Observable query subscriptions (MVP uses event + client-side re-query)
