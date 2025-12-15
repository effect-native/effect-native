# CR-SQLite Global Mesh — Package Map

## Context

Today we have two existing packages:

- **`@effect-native/crsql`**: CR-SQLite prepared statements and service layer. It exposes an Effect service that requires an `@effect/sql` SqlClient. It handles schema migrations, change-tracking queries, and basic sync primitives.

- **`@effect-native/libcrsql`**: Absolute paths to prebuilt cr-sqlite extension binaries for desktop/server platforms (macOS, Linux, Windows). This is a "bring your own SQLite" approach — consumers load the extension into their SQLite connection.

These packages serve single-node use cases well. However, the vision for a **global peer-to-peer mesh** requires additional capabilities:

- Anti-entropy synchronization logic (version vector exchange, diff requests, batch apply)
- A transport abstraction (send bytes, receive bytes, discover peers)
- Multiple transport implementations (WebRTC, WebSocket, BroadcastChannel, IPC, UDP, etc.)
- Platform-specific runtime adapters (browser OPFS, Node filesystem, React Native, etc.)

The existing packages were not designed for this scope. We need to define clear package boundaries before implementation begins.

**Source proposal:** [`../../research/zig-cr/102-proposal-crsqlite-global-mesh.md`](../../../../research/zig-cr/102-proposal-crsqlite-global-mesh.md)

---

## User Story

**As a** developer building a local-first application with Effect,

**I want** a modular set of packages that let me add peer-to-peer database synchronization to my app,

**So that** I can pick only the transports and runtime adapters I need, keep my bundle size minimal, and have my application work offline while eventually converging with peers across devices, tabs, and servers.

---

## High-Level Goals

- Define a set of **atomic, single-responsibility packages** for the global mesh capability
- Enable developers to **compose only what they need** (tree-shakeable, no monolith)
- Keep the **sync engine** agnostic to transport and persistence
- Provide **transport adapters** as separate packages (one per transport type)
- Provide **runtime adapters** as separate packages (one per platform/environment)
- Integrate cleanly with **upstream Effect SQL** abstractions
- Allow **existing `@effect-native/crsql` users** to adopt mesh features incrementally
  - NOTE: zero known production users at this time
- Support the full range of environments: browser, Node/Bun/Deno, React Native, edge workers

---

## Candidate Packages

### New Packages (names only)

1. **`@effect-native/crsql-mesh-protocol`**
   - Message type definitions for peer communication (summary exchange, diff request, change batch, etc.)

2. **`@effect-native/crsql-mesh`**
   - The sync engine: anti-entropy loop, version vector tracking, batch apply logic
   - Transport-agnostic (depends on a transport interface, not a concrete transport)

3. **`@effect-native/crsql-mesh-transport`**
   - Abstract transport interface definitions
   - Base helpers for transport implementers

4. **`@effect-native/crsql-mesh-transport-broadcast-channel`**
   - Transport adapter for same-origin browser tabs via BroadcastChannel

5. **`@effect-native/crsql-mesh-transport-websocket`**
   - Transport adapter for WebSocket connections

6. **`@effect-native/crsql-mesh-transport-webrtc`**
   - Transport adapter for WebRTC data channels (peer-to-peer)

7. **`@effect-native/crsql-mesh-transport-ipc`**
   - Transport adapter for inter-process communication (Unix domain sockets, named pipes)

8. **`@effect-native/crsql-mesh-runtime-browser`**
   - Browser-specific runtime adapter (OPFS persistence, service worker coordination)

9. **`@effect-native/crsql-mesh-runtime-node`**
   - Node.js runtime adapter (filesystem persistence, worker threads)

10. **`@effect-native/crsql-mesh-runtime-bun`**
    - Bun-specific runtime adapter (if Bun diverges from Node patterns)

11. **`@effect-native/crsql-mesh-runtime-react-native-op-sqlite`**
    - React Native runtime adapter (powered by https://github.com/OP-Engineering/op-sqlite)

12. **`@effect-native/crsql-mesh-runtime-react-native-expo-sqlite`**
    - As of Expo SDK 54 (2025-09-10), expo-sqlite added loadExtensionAsync() / loadExtensionSync() and the docs explicitly show loading a custom extension by path.

### Existing Packages to Modify

1. **`@effect-native/crsql`**
   - May gain optional integration points for the mesh core
   - Should remain usable standalone without mesh dependencies

2. **`@effect-native/libcrsql`**
   - No functional changes required for mesh
   - Continue to provide native extension binaries
   - Update with the latest libcrsql builds from our new zig implementation

### Upstream Effect SQL Packages (integration targets)

- **`@effect/sql`** — Core abstractions we build upon
- **`@effect/sql-sqlite-bun`** — Bun SQLite client we integrate with
- **`@effect/sql-sqlite-node`** — Node SQLite client we integrate with

---

## Out of Scope

The following are explicitly **not** part of this package map or initial mesh implementation:

- **Authentication and authorization** — Mesh peers are anonymous; access control is a separate layer
- **Encryption and key management** — Transport-level encryption (TLS, DTLS) is expected; application-level E2E encryption is out of scope
- **Global uniqueness constraints** — CR-SQLite provides eventual consistency, not global invariants
- **Schema migrations during sync** — DDL changes require explicit migration windows; live schema evolution is not supported
- **Query federation** — Each peer queries its local replica only
- **Membership directory or discovery service** — Peer discovery is transport-dependent; no central registry
- **Conflict resolution UI** — Conflicts are resolved deterministically by CR-SQLite; no user-facing merge UI
- **React Native-specific transport adapters** — May be added later; not in initial scope
- **Bluetooth / Multipeer Connectivity transports** — Platform-specific; deferred to future work
- **Snapshot transfer protocol** — Bootstrap via snapshot is mentioned in proposal but deferred to later phase
- **Compaction and garbage collection** — Retention policy implementation is deferred

---

## Notes for Future Phases

- Phase 2 (Requirements) will define the exact interface contracts for transport and runtime adapters
- Phase 3 (Design) will specify the anti-entropy protocol state machine and message flow
- The package list above is a **candidate** — it may be refined as requirements emerge
- Some packages may be merged if the separation proves unnecessary
- Some packages may be split if responsibilities become clearer

---

## References

- Source proposal: [`research/zig-cr/102-proposal-crsqlite-global-mesh.md`](../../../../research/zig-cr/102-proposal-crsqlite-global-mesh.md)
- Prior designs:
  - [`research/zig-cr/97-proposal-multitab-crsqlite-mesh.md`](../../../../research/zig-cr/97-proposal-multitab-crsqlite-mesh.md)
  - [`research/zig-cr/99-threadsafe-sqlite-proposals.md`](../../../../research/zig-cr/99-threadsafe-sqlite-proposals.md)
  - [`research/zig-cr/100-proposal-node-multiprocess-crsqlite-mesh.md`](../../../../research/zig-cr/100-proposal-node-multiprocess-crsqlite-mesh.md)
- Existing packages:
  - [`effect-native/packages-native/crsql/`](../../packages-native/crsql/)
  - [`effect-native/packages-native/libcrsql/`](../../packages-native/libcrsql/)
