> **Note:** This spec directory is now reference material.
> The primary spec is the unified product spec at `effect-native/.specs/crsql-mesh/`.
> Package boundaries are deferred until they block progress (see `research/thing-golf.md`).

---

# crsql-mesh-protocol — Phase 1: Instructions

## Context

CR-SQLite enables conflict-free replicated databases where each peer maintains its own local SQLite replica. To achieve eventual consistency across a global peer-to-peer mesh, peers must exchange information about what data they have and what data they need.

Currently, there is no standardized vocabulary for this exchange. Different components (browser tabs, server processes, native apps) each implement their own ad-hoc message formats, making interoperability difficult and code reuse impossible.

This package defines the shared language that all mesh participants speak, regardless of what runtime they execute on or what transport they use to communicate.

## User Story

As a developer building a sync engine for CR-SQLite,
I want a well-defined set of message types and data structures for peer communication,
so that I can implement mesh synchronization without inventing my own protocol and ensure compatibility with other implementations.

## High-Level Goals

- Define the message vocabulary for anti-entropy synchronization between CR-SQLite peers
- Reuse the existing schema vocabulary in `@effect-native/crsql` where possible (reduce new Things)
- Establish data structures for version summaries (how peers describe what they know)
- Specify message envelopes for requesting and delivering change data
- Provide a runtime-agnostic, transport-agnostic protocol definition
- Enable type-safe message handling across TypeScript/JavaScript environments
- Keep the protocol minimal — only what is necessary for convergence

## What This Package Covers

### Schema reuse (important)

Prefer reusing the existing schemas and tests in `effect-native/packages-native/crsql/`:
- `effect-native/packages-native/crsql/src/CrSqlSchema.ts`
- `effect-native/packages-native/crsql/test/`

This reduces protocol-specific serialization/deserialization work and keeps the protocol types consistent with the DB boundary.

Product decision: rely on SQLite `unhex()` (SQLite >= 3.50.2). If `unhex()` is missing/disabled, fail fast with `UnhexUnavailable` during layer creation.


### Summary Exchange
Peers need to tell each other what data versions they have seen from various sites in the mesh. This enables efficient diff-based synchronization rather than broadcasting everything.

### Diff Requests
When a peer learns it is missing data, it needs a standard way to ask another peer to send the missing changes.

### Change Delivery
The response to a diff request: a batch of change rows that the requesting peer can apply to catch up.

## Out of Scope

This package is deliberately narrow. The following are explicitly NOT part of this protocol:

- **Authentication and Authorization**: No identity verification, no access control, no signatures. The protocol assumes peers have already established trust through external means.

- **Encryption**: No wire-level encryption. Use TLS/DTLS at the transport layer if needed.

- **Transport Mechanics**: No WebSocket handling, no WebRTC signaling, no HTTP framing. This package defines message payloads, not how bytes move.

- **Peer Discovery and Membership**: No mechanism to find peers, join meshes, or track who is online. Discovery is a transport concern.

- **Persistence Strategy**: No opinion on how peers store their SQLite databases (file, OPFS, memory).

- **Compaction and Retention Policies**: No rules about when to garbage-collect old changes.

- **Schema Migration**: No DDL coordination or migration sequencing.

- **Snapshot Transfer**: No mechanism for bulk database snapshots (that would be a separate protocol concern for bootstrapping new peers).

- **Conflict Resolution Logic**: The CR-SQLite engine handles merge semantics. This protocol just moves data.

- **Implementation of Sync Engines**: This package provides the vocabulary. Actual sync logic lives elsewhere.
