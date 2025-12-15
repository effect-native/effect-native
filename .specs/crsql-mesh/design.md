# crsql-mesh — Phase 3: Design

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
