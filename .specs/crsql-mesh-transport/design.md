# crsql-mesh-transport — Phase 3: Design

## Purpose

Define a minimal transport abstraction for moving opaque bytes between peers, without coupling the mesh engine to any particular communication mechanism.

## Design Constraints

- Transport does not interpret payload contents.
- Transport does not promise ordering, retries, or persistence.
- Higher layers decide delivery semantics.

## Key Concepts

- **Peer identifier**: `SiteIdHex` (reused from `@effect-native/crsql/CrSqlSchema`).
- **Opaque payload**: an uninterpreted byte payload.
- **Lifecycle**: explicit open/close.

## Service Shape

### Operations (conceptual)

| Operation | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `open` | none | success or `TransportClosed`/implementation error | Establish underlying resources. |
| `close` | none | success | Idempotent close is allowed. |
| `send` | `to: SiteIdHex`; `payload: opaque bytes` | success or send error | Best-effort; no delivery guarantees required. |
| `receive` | none | stream of `{ from: SiteIdHex, payload: opaque bytes }` | Stream ends when transport closes. |

## Errors

| Error | Meaning | Where used |
| --- | --- | --- |
| `TransportClosed` | operation attempted while closed | Any operation after close |
| `PeerUnreachable` | transport cannot address peer | `send` |
| `SendFailed` | generic send failure | `send` |

## In-Memory Transport

### Purpose

Provide a deterministic, same-process transport useful for testing the mesh logic without network dependencies.

### Behavior

- Allows constructing multiple peers within one process and wiring their send/receive channels.
- Supports deterministic delivery ordering suitable for tests.
- Has no dependencies on platform or network APIs.

## Composition

Transports may be composed above this interface (for example, to add retries, acknowledgements, ordering, or encryption), but those behaviors are outside this package.

## Out of Scope

- Discovery or peer enumeration.
- Authentication and encryption.
- Specific implementations (WebSocket, WebRTC, IPC, Bluetooth, etc.).
- Routing/relay logic and QoS.
