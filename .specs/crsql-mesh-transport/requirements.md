# crsql-mesh-transport — Phase 2: Requirements

## Functional Requirements

### Transport Interface (FR-TRANS-001)

The Transport shall define a minimal interface with:
- A `send` operation accepting a peer identifier and opaque byte payload
- A `receive` stream emitting incoming messages with sender identifier
- A `broadcast` operation sending to all reachable peers (optional capability)

### In-Memory Transport (FR-TRANS-002)

The Transport shall provide an `InMemoryTransport` implementation that:
- Connects peers within the same process without network I/O
- Supports deterministic message ordering for testing
- Enables two-peer sync loops without external dependencies

### Peer Addressing (FR-TRANS-003)

**When** addressing a peer,
**Then** the Transport shall accept `SiteIdHex` (from `@effect-native/crsql/CrSqlSchema`) as the peer identifier type.

### Message Delivery Semantics (FR-TRANS-004)

The Transport interface shall declare:
- At-most-once delivery (no built-in retries; callers handle retransmission)
- No ordering guarantees (messages may arrive out of order)
- No persistence (messages are not durably stored)

### Transport Lifecycle (FR-TRANS-005)

The Transport shall define lifecycle operations:
- `open`: establish the transport (connect, bind, etc.)
- `close`: tear down the transport (disconnect, unbind, etc.)

**When** `close` is called,
**Then** the Transport shall complete all pending `send` operations or cancel them with `TransportClosed` error.

### Transport Errors (FR-TRANS-006)

The Transport shall define error types:
- `TransportClosed`: operation attempted on closed transport
- `PeerUnreachable`: target peer cannot be reached
- `SendFailed`: generic send failure with underlying cause

### Effect Service Definition (FR-TRANS-007)

The Transport shall be defined as an Effect `Context.Tag` service, enabling:
- Layer-based dependency injection
- Swappable implementations (in-memory for tests, real transports for production)

## Non-Functional Requirements

### NFR-TRANS-001: Transport Agnostic
The interface accepts and returns opaque `Uint8Array` payloads. It does not interpret message contents.

### NFR-TRANS-002: Zero External Dependencies
The `InMemoryTransport` has no dependencies on network libraries or platform APIs.

## Constraints

### C-TRANS-001: No Built-in Discovery
Peer discovery is out of scope. Transports assume callers know which peers to address.

### C-TRANS-002: No Built-in Encryption
Security is handled at the transport implementation level or by wrapping transports, not in the interface.

## Out of Scope

Aligned with Phase 1 instructions:
- Specific transport implementations (WebSocket, WebRTC, IPC, etc.)
- Peer discovery and enumeration
- Authentication and encryption at the interface level
- Message framing and serialization (transport's responsibility)
- Connection management (reconnection, keepalives)
- Routing and relay logic
- Bandwidth management and QoS
