# crsql-mesh-protocol — Phase 2: Requirements

## Functional Requirements

### Schema Reuse (FR-PROTO-001)

**When** defining protocol message types,
**Then** the Protocol shall reuse schemas from `@effect-native/crsql/CrSqlSchema`:
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
- An array of `ChangeRowSerialized` (or `ChangeArray`) rows
- A boolean indicating whether more changes remain beyond this batch
- The sender's current `VersionSummary` after the batch

### Message Envelope (FR-PROTO-006)

The Protocol shall define a `MeshMessage` envelope containing:
- A discriminated union of: `VersionSummary`, `DiffRequest`, `DiffResponse`
- A monotonic message sequence number (for deduplication)
- The sender's `SiteIdHex`

### Effect Schema Encoding (FR-PROTO-007)

The Protocol shall provide Effect Schema definitions for all message types, enabling:
- JSON encoding/decoding via `Schema.encode` / `Schema.decode`
- Runtime validation of incoming messages

## Non-Functional Requirements

### NFR-PROTO-001: No Transport Coupling
Message types are transport-agnostic byte payloads. The Protocol does not reference WebSocket, HTTP, or any transport mechanism.

### NFR-PROTO-002: Minimal New Types
The Protocol introduces only types necessary for mesh coordination that do not already exist in `@effect-native/crsql`.

## Constraints

### C-PROTO-001: SQLite Version
Requires SQLite >= 3.50.2 for `unhex()` support.

### C-PROTO-002: No Custom Serialization
All serialization uses Effect Schema. No hand-rolled JSON parsing or binary protocols in Phase 1.

## Out of Scope

Aligned with Phase 1 instructions:
- Authentication, authorization, signatures
- Encryption (use transport-layer TLS if needed)
- Transport mechanics (framing, connection handling)
- Peer discovery and membership
- Compaction and retention policies
- Schema migration coordination
- Snapshot transfer for bootstrapping
- Conflict resolution customization
