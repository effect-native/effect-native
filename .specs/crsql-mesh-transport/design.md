# crsql-mesh-transport — Phase 3: Design

## Purpose

Define a minimal transport abstraction for moving opaque bytes between peers, without coupling the mesh engine to any particular communication mechanism.

## Design Constraints

- Transport does not interpret payload contents.
- Transport does not promise ordering, retries, or persistence.
- Higher layers decide delivery semantics.
- Transport is an Effect service (Context.Tag) so implementations are swappable and testable.

## Key Concepts

- **Peer identifier**: `SiteIdHex` (reused from `@effect-native/crsql/CrSqlSchema`).
- **Opaque payload**: an uninterpreted byte payload (a `Uint8Array`).
- **Lifecycle**: explicit open/close.

## Service Shape (API signatures as prose)

| Operation | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `open` | none | success or a transport error | Establish underlying resources. |
| `close` | none | success | Idempotent close is allowed. |
| `send` | `to: SiteIdHex`; `payload: opaque bytes` | success or send error | Best-effort; no delivery guarantees required. |
| `receive` | none | stream of `{ from: SiteIdHex, payload: opaque bytes }` | Stream ends when transport closes. |

## Error Handling Strategy

| Error | Meaning | Where used | Caller strategy |
| --- | --- | --- | --- |
| `TransportClosed` | operation attempted while closed | Any operation after close | Treat as terminal for that transport instance. |
| `PeerUnreachable` | transport cannot address peer | `send` | Caller may retry or mark peer offline. |
| `SendFailed` | generic send failure | `send` | Caller may retry with backoff or surface telemetry. |

## In-Memory Transport

### Purpose

Provide a deterministic, same-process transport useful for testing mesh logic without network dependencies.

### Behavior

- Allows constructing multiple peers within one process and wiring their send/receive channels.
- Supports deterministic delivery ordering suitable for tests.
- Has no dependencies on platform or network APIs.

### Determinism model

- Messages are delivered in FIFO order per sender-to-receiver channel.
- The test harness is able to decide when to “flush” pending deliveries, so tests can create stable, step-driven scenarios.

## Module Architecture

Suggested layout:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Re-exports public surface. |
| `src/Transport.ts` | `Transport` tag + service interface. |
| `src/TransportError.ts` | Error data types. |
| `src/InMemoryTransport.ts` | In-memory deterministic transport implementation and helpers. |

## Test Strategy

### Unit tests (interface + lifecycle)

- `Transport` is a `Context.Tag` and can be provided via Layer.
- After `close`, operations fail with `TransportClosed`.
- `receive` stream ends after close.

### Unit tests (in-memory determinism)

- Two peers can send/receive without network I/O.
- Ordering is deterministic and matches FIFO expectations.
- Duplicate sends are delivered as duplicates (transport does not dedupe).

## Out of Scope

- Discovery or peer enumeration.
- Authentication and encryption.
- Specific implementations (WebSocket, WebRTC, IPC, Bluetooth, etc.).
- Routing/relay logic and QoS.
