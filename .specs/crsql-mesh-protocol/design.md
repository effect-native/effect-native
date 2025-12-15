# crsql-mesh-protocol — Phase 3: Design

## Purpose

Define the shared, transport-agnostic message vocabulary used by mesh participants to summarize replica state and request/transfer missing change rows.

This package defines message shapes and their schema/validation strategy. It does not define networking behavior or sync algorithms.

## Design Constraints

- Reuse existing schema vocabulary from `@effect-native/crsql/CrSqlSchema` wherever possible.
- Fail fast if SQLite `unhex()` is unavailable.
- Keep new named concepts minimal.

## Key Concepts

- **Version vector summary**: a compact statement of “what I have seen so far”.
- **Diff request/response**: a pull-based, batched transfer of missing change rows.
- **Envelope**: one discriminated message shape for all protocol messages.

## Data Models

### Reused types (from `@effect-native/crsql/CrSqlSchema`)

- `SiteIdHex`
- `VersionString`
- `TrackedPeerSerialized`
- `ChangeRowSerialized`

### Protocol-native types

| Name | Fields | Notes |
| --- | --- | --- |
| `VersionSummary` | `localSiteId: SiteIdHex`; `peers: map<SiteIdHex, VersionString>` | `peers` represents the highest `db_version` known per site. |
| `DiffRequest` | `summary: VersionSummary`; `maxChangeRows?: number` | Optional batch cap provided by requester. |
| `DiffResponse` | `changeRows: ChangeRowSerialized[]`; `hasMore: boolean`; `summary: VersionSummary` | `summary` represents sender’s view after selecting the batch. |
| `MeshMessage` | `kind: one of {VersionSummary, DiffRequest, DiffResponse}`; `seq: monotonic integer`; `sender: SiteIdHex` | `seq` exists to support deduplication at higher layers. |

## Schemas and Validation

- Provide schema definitions for each protocol-native type.
- Provide schema definitions for the envelope (`MeshMessage`) with a discriminated union over `kind`.
- Provide validation for decoding incoming messages, surfacing a protocol-level error when decoding fails.

## SQLite Capability Check

### Layer initialization behavior

- During protocol-layer initialization, perform a capability check for `unhex()`.
- If the check indicates `unhex()` is missing/disabled, fail with `UnhexUnavailable`.

### Errors

| Error | Meaning | Recovery |
| --- | --- | --- |
| `UnhexUnavailable` | SQLite build does not provide `unhex()` | No recovery in this phase; caller must provide a compatible SQLite. |

## Public Surface (prose)

- The package exports message model types and schema definitions for encoding/decoding and validation.
- The package exports a protocol “layer” constructor that performs the `unhex()` capability check.

## Out of Scope

- Transport framing, connection management, discovery, membership.
- Security features (authn/authz, encryption, signatures).
- Snapshot bootstrapping, compaction/retention.
- Any synchronization algorithm beyond defining message vocabulary.
