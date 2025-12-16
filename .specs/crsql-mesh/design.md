# crsql-mesh — Phase 3: Design

## Product-Level Module Map

The crsql-mesh system spans multiple concerns. This section provides a high-level map of how they relate.

| Concern | Responsibility | Primary Runtime |
| --- | --- | --- |
| Mesh Engine | Transport-agnostic sync: compare summaries, request/apply diffs | Any (Node, Bun, Browser Worker) |
| Browser Multi-Tab Orchestration | Coordinate OPFS access across tabs; elect provider; route SQL | Browser only |
| Protocol | Encode/decode MeshMessage envelopes | Any |
| Transport | Best-effort send/receive of payloads | Varies by environment |
| Database Connection | SQLite + CR-SQLite access | Varies by runtime |

The Mesh Engine (described below) is runtime-agnostic. The Browser Multi-Tab design (described in a later section) is a browser-specific orchestration layer that ensures only one tab owns the OPFS database connection at a time.

## Purpose

Provide a transport-agnostic synchronization engine that:
- Compares peer summaries
- Requests missing change rows
- Responds to peer diff requests
- Applies received change rows transactionally

The engine does not own application writes; applications write directly to SQLite.

## Inputs / Dependencies

- Protocol (`@effect-native/crsql-mesh-protocol`): decoding/encoding and validation of `MeshMessage` envelopes and message bodies.
- Transport (`@effect-native/crsql-mesh-transport`): best-effort send and a stream of received payloads.
- Database connection (`@effect-native/crsql`): a SQLite connection compatible with CR-SQLite change selection and change application.

## Effect-TS Design Principles (alignment notes)

This package is designed to fit typical Effect service patterns found in `@effect/*`:

- **Scoped resources**: long-running fibers (sync loops) are owned by a `Scope` and are cleaned up automatically when the scope closes.
- **Layer-based construction**: a `Layer.scoped(...)` constructor wires dependencies and starts background work within the layer’s scope.
- **Interruptibility**: long-running loops are interruptible; shutdown is expressed as scope closure, not a bespoke global mutable state.

## Public Surface (API signatures as prose)

### Service tag

The Mesh is provided as an Effect `Context.Tag` service named `Mesh`.

### Capabilities

| Capability | Input | Output | Notes |
| --- | --- | --- | --- |
| Run sync | none | An Effect that never resolves under normal operation | Primary entrypoint for “run until scope closes”. Implemented as a supervised set of fibers. |
| Shutdown | none | An Effect that stops background work | Convenience for explicit shutdown; semantically equivalent to closing the scope owning the Mesh. |
| Current version vector | none | An Effect yielding the in-memory version vector | Returns a snapshot of current state. |
| Observe local progress | none | A stream (or subscription) of local `db_version` advances | Used for UI refresh patterns (re-query on advance). |

### Layers

| Layer | Requires | Provides | Notes |
| --- | --- | --- | --- |
| `MeshLive` | `Transport`, Protocol service (from `@effect-native/crsql-mesh-protocol`), database connection service (from `@effect-native/crsql`), `MeshConfig` | `Mesh` | Constructed with `Layer.scoped` and owns background fibers in its scope. |

### Configuration

| Config | Meaning | Defaulting policy |
| --- | --- | --- |
| `syncInterval` | Time between periodic summary exchanges (per peer) | Required by caller (no default required by this design). |
| `maxChangeRows` | Default batch cap when requesting or responding | Optional; if omitted, sender decides a safe cap. |
| `errorBackoff` | Backoff policy for transient peer failures | Optional; if omitted, use a conservative spaced retry. |

## Module Architecture

This package is intended to stay shallow and composable. One recommended file layout:

| File | Responsibility |
| --- | --- |
| `src/Mesh.ts` | `Mesh` tag, service interface, `MeshConfig`, public constructors. |
| `src/MeshError.ts` | Error data types exported by the package. |
| `src/internal/peer.ts` | Per-peer state model and peer loop orchestration. |
| `src/internal/receive.ts` | Transport receive stream handling, protocol decoding, routing. |
| `src/internal/diff.ts` | Computing missing rows and creating responses (DB read path). |
| `src/internal/apply.ts` | Transactional apply and version-vector update logic (DB write path). |
| `src/index.ts` | Re-exports. |

Notes:
- The implementation may collapse internal modules if it remains small; the intent is to keep responsibilities separable and testable.
- No transport implementations live here.

## State

### Version vector

Maintain an in-memory map:

- Key: `SiteIdHex`
- Value: highest `db_version` observed for that site

Update only after a successful transactional apply.

Representation strategy (Effect-aligned):
- Use a mutable reference abstraction (e.g., a Ref-like structure) so updates are atomic and reads are consistent within an Effect.

### Per-peer state

Track per-peer operational state:

- Last exchanged `VersionSummary` (local view of peer’s summary)
- Backoff state for retries
- Optional deduplication state

### Message deduplication

`MeshMessage.seq` exists to support deduplication, but ordering is not guaranteed by the Transport.

Design stance:
- **Correctness does not depend on deduplication.**
- If deduplication is enabled, it must tolerate out-of-order delivery.

Recommended strategy:
- Maintain a bounded “recently seen” window per sender (e.g., last N `seq` values) and drop exact repeats.
- Do not assume `seq` is contiguous or that `seq < lastSeen` implies “safe to drop”.

## Core Loop

### High-level behavior

For each connected peer, the engine runs a repeating exchange:

1. Send `VersionSummary` periodically.
2. When a peer summary indicates local is missing remote changes, request missing rows via `DiffRequest`.
3. When receiving a peer `DiffRequest`, compute missing change rows and respond with `DiffResponse`.
4. When receiving a `DiffResponse`, apply received rows within a single transaction.
5. After successful apply, update the in-memory version vector.

The design does not require a single global ordering across peers.

### Concurrency model (Effect-aligned)

The Mesh runtime is composed from a small set of scoped fibers:

- **Receive fiber**: consumes `Transport.receive` as a stream, decodes `MeshMessage`, and routes messages by peer.
- **Per-peer periodic fiber(s)**: performs periodic summary exchange and drives the pull loop (requesting diffs until “caught up”).

All fibers are forked into the Mesh layer scope (structured concurrency), so shutdown is handled by closing the scope.

## Database Interaction

### Change selection (read path)

Given a requester’s `VersionSummary`:

- Compute the set of change rows the requester is missing.
- Select up to `maxChangeRows`.
- Construct a `DiffResponse` that includes:
  - The batch of `ChangeRowSerialized`
  - A `hasMore` flag
  - A `VersionSummary` representing the sender’s current view after selecting the batch

Selection uses the `@effect-native/crsql` change schema and (where available) existing helper functions.

### Change application (write path)

- Apply a received batch inside a single SQLite transaction.
- On any failure, roll back and report `ApplyFailed`.
- Only after successful commit:
  - Update the in-memory version vector.
  - Emit a “local db_version advanced” notification for observers.

Idempotency is achieved by ensuring duplicate batches do not change final state.

## Observability

### Local `db_version` advances

The Mesh provides a mechanism for callers to observe local progress.

Design requirements for the mechanism:
- It emits when the local replica’s `db_version` advances due to applying incoming changes.
- It does not require intercepting application writes.

Implementation strategy (Effect-aligned):
- Use a broadcast primitive (PubSub-like) or a subscription reference so many consumers can observe updates without polling.

## Error Handling Strategy

### Error categories

| Error | Meaning | Handling strategy |
| --- | --- | --- |
| `ProtocolError` | Incoming message failed decoding/validation | Treat as a peer message rejection; drop the message and continue. Optionally mark the peer as unhealthy. |
| `ApplyFailed` | Transactional apply failed and was rolled back | Fail the current peer-round; retry with backoff. Emit an error signal for observability. |
| `SyncInterrupted` | Loop stopped due to shutdown or transport closure | Normal shutdown path when scope closes or transport ends; used as the terminal error for the long-running run effect. |

### Recovery and retries

- Peer-specific failures use a peer-specific retry policy (backoff).
- Retries must not block local DB usage.
- A single failing peer must not necessarily terminate the entire Mesh, unless the transport itself closes.

## Test Strategy

Testing splits into deterministic unit tests and a small number of integration tests.

### Unit tests (fast, deterministic)

Target: correctness of orchestration and protocol interactions.

Approach:
- Use the `In-Memory Transport` described by `@effect-native/crsql-mesh-transport` to simulate multiple peers.
- Replace database access with a minimal test double that can:
  - Provide a `VersionSummary`
  - Provide “missing change rows” for a requester summary
  - Record applied change batches and simulate transactional failure

Key cases:
- Two peers converge after exchanging summaries and diffs.
- Duplicate `DiffResponse` batches do not change final state.
- Out-of-order message delivery still converges.
- Apply failure rolls back and triggers a retry path.

### Integration tests (slower, evidence of real DB semantics)

Target: correctness with an actual SQLite + CR-SQLite connection.

Approach:
- Stand up two (or more) real databases with CR-SQLite enabled.
- Use the in-memory transport to connect them.
- Perform real writes on one replica and validate convergence on the other.

Key cases:
- Transactional apply yields atomic visibility of incoming batches.
- Version vector updates reflect observed site/db_version advances.

## Out of Scope

- Transport implementations.
- Persistence of version vectors across restarts.
- Snapshot bootstrapping.
- Compaction and garbage collection.
- Authentication and authorization.
- Schema migration coordination.

---

## Browser Multi-Tab Design (crsqlite-web-multitab)

This section describes the browser-specific orchestration layer that enables multiple tabs to share a single OPFS-backed CR-SQLite database safely.

### Problem Statement

In browsers, OPFS (Origin Private File System) does not safely support concurrent access from multiple tabs. Opening the same database from multiple tabs causes corruption. Additionally, SharedArrayBuffer-based solutions require COOP/COEP headers, which many applications cannot deploy.

The solution is a "browser database daemon" pattern: one tab owns the database connection, and all other tabs proxy their requests through it.

### Architectural Roles

| Role | Runtime Location | Responsibility |
| --- | --- | --- |
| Coordinator | SharedWorker (preferred) or ServiceWorker (fallback) | Elects the provider tab, holds MessagePorts for all connected clients, routes requests from clients to provider, detects provider death and triggers re-election |
| Provider | Dedicated Worker in one tab | Owns the OPFS database connection, loads the sqlite+crsqlite wasm bundle, executes SQL requests sequentially, broadcasts notifications |
| Client | Main thread of any tab | Uses a DbClient proxy to issue SQL requests, receives notifications of db_version advances, re-queries on notification |

### The "Only Provider Touches OPFS" Invariant

At any moment, exactly one provider worker holds the OPFS database connection. No other tab or worker may open the database file directly. This invariant eliminates corruption risk and removes the need for SharedArrayBuffer or COOP/COEP headers.

All SQL execution flows through the provider:

- Client tabs send requests to the coordinator
- Coordinator forwards requests to the provider
- Provider executes SQL and returns results via coordinator
- Provider broadcasts db_version changes through coordinator to all clients

### Provider Election Strategy (MVP)

Election uses Web Locks, a browser API that provides cross-tab mutual exclusion.

**Lock name convention:** Each logical database uses a lock named by pattern, such as combining a prefix with the database name.

**Election process:**

1. When a tab wants to become provider, it requests an exclusive Web Lock for that database name
2. The first tab to acquire the lock becomes provider
3. The tab holds the lock for the lifetime of its provider role
4. If the provider tab closes or crashes, the lock is released, and another waiting tab acquires it

**Coordinator role in election:**

- The coordinator does not hold the Web Lock itself
- The coordinator tracks which client port belongs to the current provider
- When a new provider acquires the lock, it registers with the coordinator

### Liveness and Death Detection

**Provider liveness:** The coordinator monitors the MessagePort to the provider. If the port disconnects (tab closed, worker crashed), the coordinator:

1. Marks the provider as dead
2. Notifies clients that provider is unavailable
3. Waits for a new provider to register (another tab will acquire the Web Lock and register)

**Client liveness (optional enhancement):** Clients can hold their own Web Locks (shared mode) so the provider can detect when a client disappears and clean up per-client subscriptions.

### Notification Pathway for db_version Advances

When the provider applies changes (either from local writes or from mesh sync), it must notify clients so they can refresh their views.

**Notification flow:**

1. After any write transaction commits, the provider checks the current db_version
2. If db_version has advanced, the provider sends a notification message through its port to the coordinator
3. The coordinator broadcasts this notification to all connected client ports
4. Each client's DbClient proxy receives the notification and can trigger re-queries or UI updates

**Notification content (minimal):** The database name and the new db_version value. Clients do not receive the actual changed data; they re-query as needed.

### Request/Response Flow

**For a SQL query from Tab A:**

1. Tab A's main thread calls DbClient with a query
2. DbClient sends a request (with a unique request ID) to the coordinator
3. Coordinator forwards the request to the provider worker
4. Provider executes the query against the OPFS-backed database
5. Provider sends the result (with the same request ID) back to the coordinator
6. Coordinator routes the result to Tab A
7. DbClient resolves the pending promise

**Serial execution:** The provider processes requests sequentially (single queue). This avoids overlapping transactions and simplifies correctness.

### Migration Safety (Provider Death Mid-Request)

When a provider dies while a request is in flight, the client cannot know if a write committed.

**MVP approach:** For write operations, clients supply a transaction ID. The provider uses an idempotency guard (a small tracking table) so that retrying the same transaction ID is safe. If the previous attempt committed, the retry detects this and returns success without re-executing. If it failed, the retry executes normally.

### Coordinator Implementation Options

| Option | Availability | Notes |
| --- | --- | --- |
| SharedWorker | Most desktop browsers; limited on Android | Preferred; survives tab navigation; natural fit for port management |
| ServiceWorker | Broad availability | Fallback; requires different lifecycle management; no sync OPFS handles |

The coordinator does not touch OPFS; it only routes messages and manages ports.

### Integration with Mesh Engine

The browser multi-tab layer is orthogonal to the Mesh Engine. The provider worker can run the Mesh sync loop internally:

- The provider's database connection is the Mesh's database dependency
- The Mesh's "observe local progress" capability feeds into the notification broadcast
- Clients are unaware of mesh sync; they simply see db_version advances

This separation means the Mesh Engine design (transport-agnostic sync) remains unchanged. The browser orchestration is purely a runtime integration concern.
