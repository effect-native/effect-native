# crsql-mesh-protocol — Phase 3: Design

## Purpose

Define the shared, transport-agnostic message vocabulary used by mesh participants to summarize replica state and request/transfer missing change rows.

This package defines message shapes and their schema/validation strategy. It does not define networking behavior or sync algorithms.

## Inputs / Dependencies

- `@effect-native/crsql/CrSqlSchema` for reused schema vocabulary.
- A SQLite connection capability (via `@effect-native/crsql`) for the `unhex()` capability check performed at layer initialization.

## Design Constraints

- Reuse existing schema vocabulary from `@effect-native/crsql/CrSqlSchema` wherever possible.
- Fail fast if SQLite `unhex()` is unavailable.
- Keep new named concepts minimal.
- Serialization is schema-first (Effect Schema). No bespoke parsing logic.

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
- Provide a decode/validate entrypoint that surfaces a `ProtocolError` when decoding fails.

Validation stance:
- Decoding failures are expected, typed errors.
- Decoding failures are not defects.

## SQLite Capability Check

### Layer initialization behavior

- During protocol-layer initialization, perform a capability check for `unhex()`.
- The check executes a small test query against the provided SQLite connection.
- If the check indicates `unhex()` is missing/disabled, fail with `UnhexUnavailable`.

### Errors

| Error | Meaning | Recovery |
| --- | --- | --- |
| `UnhexUnavailable` | SQLite build does not provide `unhex()` | No recovery in this phase; caller must provide a compatible SQLite. |
| `ProtocolError` | Incoming message failed schema validation/decoding | Caller drops or rejects the message. |

## Public Surface (API signatures as prose)

| Export | Description |
| --- | --- |
| Message model types | `VersionSummary`, `DiffRequest`, `DiffResponse`, `MeshMessage` (and any supporting aliases). |
| Schemas | Effect Schema values for each message type. |
| Encode/decode helpers | Helpers that encode messages and validate/decode incoming payloads using the schemas. |
| Protocol layer | A layer constructor that performs the `unhex()` capability check at acquisition time. |

## Module Architecture

A suggested (shallow) layout:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Re-exports public surface. |
| `src/Protocol.ts` | Protocol tag / service surface and layer constructor. |
| `src/Messages.ts` | Data model names and schema definitions. |
| `src/ProtocolError.ts` | `ProtocolError`, `UnhexUnavailable` error types. |

## Test Strategy

### Unit tests (schema correctness)

- Decode valid payloads for each message type.
- Reject invalid payloads with `ProtocolError`.
- Roundtrip encode/decode for representative messages.

### Integration tests (capability check)

- Acquire the protocol layer against a real SQLite connection and assert:
  - It succeeds when `unhex()` exists.
  - It fails with `UnhexUnavailable` when the capability is absent/disabled (where the test environment can simulate this).

## Out of Scope

- Transport framing, connection management, discovery, membership.
- Security features (authn/authz, encryption, signatures).
- Snapshot bootstrapping, compaction/retention.
- Any synchronization algorithm beyond defining message vocabulary.
