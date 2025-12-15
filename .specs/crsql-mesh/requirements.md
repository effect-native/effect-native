# crsql-mesh — Phase 2: Requirements

## Functional Requirements

### Anti-Entropy Loop (FR-MESH-001)

The Mesh shall implement an anti-entropy synchronization loop that:
- Periodically exchanges `VersionSummary` messages with connected peers
- Computes missing changes by comparing local vs. remote version vectors
- Requests missing changes via `DiffRequest`
- Applies received changes via `DiffResponse`

### Version Vector Management (FR-MESH-002)

The Mesh shall maintain an in-memory version vector:
- Tracking the highest `db_version` seen from each `SiteIdHex`
- Updated after successfully applying incoming change batches
- Queryable by callers to observe sync progress

### Change Pull (FR-MESH-003)

**When** a peer sends a `DiffRequest`,
**Then** the Mesh shall query local `crsql_changes` for rows the requester is missing,
respecting the optional batch size limit.

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

### DB Version Observable (FR-MESH-007)

The Mesh shall provide an observable stream of local `db_version` changes, enabling UI refresh patterns ("db changed, re-query").

### Transport Integration (FR-MESH-008)

The Mesh shall depend on `@effect-native/crsql-mesh-transport` interface:
- Sending protocol messages via `Transport.send`
- Receiving protocol messages via `Transport.receive`

### Protocol Integration (FR-MESH-009)

The Mesh shall depend on `@effect-native/crsql-mesh-protocol`:
- Encoding/decoding `MeshMessage` envelopes
- Reusing `VersionSummary`, `DiffRequest`, `DiffResponse` types

### CrSql Integration (FR-MESH-010)

The Mesh shall depend on `@effect-native/crsql`:
- Using `CrSqlSchema` types for change rows
- Using existing pull/apply helpers where available

### Error Types (FR-MESH-011)

The Mesh shall define error types:
- `ApplyFailed`: change application failed (with underlying cause)
- `ProtocolError`: invalid or malformed message received
- `SyncInterrupted`: sync loop was interrupted (transport closed, shutdown)

### Effect Service Definition (FR-MESH-012)

The Mesh shall be defined as an Effect `Context.Tag` service with:
- A `MeshLive` layer requiring `Transport` and database connection
- Configurable sync interval

## Non-Functional Requirements

### NFR-MESH-001: Eventual Consistency
All replicas participating in the mesh eventually converge. No upper time bound on convergence.

### NFR-MESH-002: No Global Ordering
Changes are causally ordered per-site but have no total global order.

### NFR-MESH-003: Resilient to Duplicates
Duplicate messages and duplicate change batches are handled gracefully (idempotent).

## Constraints

### C-MESH-001: CR-SQLite Merge Semantics
Uses CR-SQLite's built-in last-write-wins merge. No custom conflict resolution.

### C-MESH-002: No Persistent Sync State
Version vectors are in-memory during a session. Persistence across restarts is a caller concern.

## Out of Scope

Aligned with Phase 1 instructions:
- Transport implementations
- Global uniqueness guarantees (application generates UUIDs)
- Linearizable reads
- Authentication and authorization
- Schema migration coordination
- Conflict resolution customization
- Snapshot bootstrapping for new peers
- Compaction and garbage collection
