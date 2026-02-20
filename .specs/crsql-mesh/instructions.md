# @effect-native/crsql-mesh — Instructions

## Context

CR-SQLite provides conflict-free replicated SQLite databases, but it only provides the merge semantics and storage. There is currently no standard way to coordinate synchronization between multiple replicas running across different processes, threads, devices, or network boundaries.

Each replica today must implement its own ad-hoc sync logic to:

- detect when local changes have occurred
- package those changes for transmission
- receive changes from other replicas
- apply incoming changes correctly

This duplicated effort leads to inconsistent implementations, bugs, and wasted developer time across projects.

## User Story

As a developer building local-first applications, I want a transport-agnostic sync engine that handles the anti-entropy loop between CR-SQLite replicas, so that I can focus on my application logic and transport choices rather than reimplementing sync coordination.

## High-Level Goals

- **Transport-agnostic core**: The sync engine operates on abstract "send bytes" and "receive bytes" operations; it does not care whether bytes travel via WebSocket, WebRTC, IPC, shared memory, or carrier pigeon.

- **Anti-entropy loop management**: The engine maintains version vector summaries, computes what changes are missing between peers, requests missing data, and applies incoming batches.

- **Transactional change application**: Incoming change batches are applied within SQLite transactions to ensure atomicity.

- **Local-first by design**: Local commits are instant (just SQLite). Sync is decoupled from the user interaction loop. The engine never blocks local writes waiting for network.

- **Eventual consistency for callers**: All replicas participating in the mesh will eventually converge to the same state. "Eventually" means there is no upper time bound—convergence happens as connectivity and message delivery permit. Between sync rounds, different replicas may observe different states. Applications must be designed to tolerate temporary divergence.

- **Idempotent and resilient**: The engine tolerates duplicate messages, out-of-order delivery, and transient failures. Applying the same change batch multiple times produces the same result.

- **Observable progress**: Callers can observe when the local replica's version advances, enabling UI refresh patterns based on "db_version changed" notifications.

## Out of Scope

The following are explicitly NOT part of this package:

- **Transport implementations**: No WebSocket, WebRTC, HTTP, IPC, or any concrete transport code. Transport adapters are separate packages that plug into this engine.

- **Global uniqueness guarantees**: The mesh does not provide globally unique IDs or prevent ID collisions. If your application needs unique identifiers, you must generate them appropriately (UUIDs, ULIDs, etc.) at the application layer.

- **Linearizable reads**: You query your local replica. Two peers querying "at the same time" may see different states. There is no global read consistency.

- **Strict ordering guarantees**: Changes are causally ordered per-site, but there is no total global ordering across sites. Different peers may observe writes from different sites in different interleaved orders.

- **Authentication, authorization, or identity**: The engine moves bytes between replicas. It does not verify who is allowed to send or receive. Access control is a higher-layer concern.

- **Schema migrations**: DDL synchronization and migration coordination are separate concerns. This engine syncs row-level CRDT changes, not schema changes.

- **Conflict resolution customization**: CR-SQLite's built-in last-write-wins merge semantics are used. Custom conflict resolution policies are not part of this package.

- **Snapshot bootstrapping**: While new peers may need snapshots to catch up efficiently, snapshot generation and transfer is a separate concern from the core anti-entropy loop.

- **Compaction and garbage collection**: Strategies for bounding change history growth are policy decisions that belong outside the core engine.

- **Persistence of sync state**: The engine operates on in-memory version vectors during a session. How and whether to persist sync state across restarts is a caller concern.
