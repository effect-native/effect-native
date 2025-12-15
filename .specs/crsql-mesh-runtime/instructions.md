# @effect-native/crsql-mesh-runtime-* — Instructions

## Context

The CR-SQLite mesh sync engine (defined in `@effect-native/crsql-mesh`) is deliberately transport-agnostic and persistence-agnostic. It operates on abstract interfaces: "send bytes", "receive bytes", "persist database", "read database". The engine does not know or care whether bytes travel via BroadcastChannel or WebRTC, or whether the database lives in OPFS or on a filesystem.

However, real applications run on real platforms. Each platform has fundamentally different:

- **Persistence mechanisms**: Browsers use OPFS (Origin Private File System) or IndexedDB; Node/Bun/Deno use the filesystem; React Native uses platform-native SQLite bindings.
- **Threading models**: Browsers use Web Workers and SharedWorkers; Node uses Worker Threads; React Native has its own threading story.
- **Inter-process / inter-context coordination**: Browsers coordinate tabs via BroadcastChannel or SharedWorker; Node processes coordinate via IPC or TCP; React Native apps may coordinate via app groups or shared containers.
- **Lifecycle constraints**: Browser tabs can be frozen, suspended, or evicted; mobile apps get backgrounded and killed; server processes typically run continuously.

Today, a developer wanting to use the mesh sync engine must manually wire up all these platform-specific details. This is tedious, error-prone, and duplicates effort across projects.

## User Story

**As a** developer building a local-first application with Effect,

**I want** pre-built platform adapters that handle persistence and coordination for my target runtime,

**So that** I can add mesh sync to my app by importing the right adapter package instead of implementing platform-specific glue code myself.

## High-Level Goals

- **One adapter package per platform category**: Each target platform (browser, Node-like server, React Native, Electron) gets its own package that bundles the platform-specific logic.

- **Consistent developer experience**: Regardless of platform, the adapter surfaces the same abstract capabilities to the mesh core — "here is how to persist", "here is how to coordinate with local peers".

- **Minimal dependencies per platform**: Each adapter only includes what that platform needs. A browser adapter does not pull in Node filesystem modules; a Node adapter does not pull in OPFS polyfills.

- **Sensible defaults with escape hatches**: Adapters provide reasonable default configurations (e.g., database location, worker setup) while allowing developers to override when needed.

- **Lifecycle-aware coordination**: Adapters understand their platform's lifecycle (tab freeze, app background, process signals) and handle cleanup, state persistence, and recovery appropriately.

## Proposed Runtime Packages

### 1. Browser Runtime (`@effect-native/crsql-mesh-runtime-browser`)

**Why separate**: Browsers have unique constraints — OPFS for persistence, Web Workers for threading, BroadcastChannel or SharedWorker for tab coordination, and complex lifecycle events (visibility change, freeze, unload). None of this applies to server-side runtimes.

**Target environments**: Modern browsers (Chrome, Firefox, Safari, Edge) with OPFS support. Progressive enhancement for older browsers without OPFS.

**Key responsibilities**:
- Coordinate the "single writer, multiple readers" pattern across browser tabs
- Manage SQLite WASM persistence to OPFS
- Handle tab lifecycle (freeze, resume, close)
- Expose change notifications to other tabs via BroadcastChannel
- Optional Service Worker mode for better background resilience

### 2. Node/Bun/Deno Runtime (`@effect-native/crsql-mesh-runtime-node`)

Note: Bun support is folded into this package unless proven necessary.

**Why separate**: Server-side JavaScript runtimes share enough common ground (filesystem access, process model, similar APIs) to warrant a single package. They differ significantly from browsers in persistence (filesystem vs OPFS), threading (Worker Threads vs Web Workers), and lifecycle (long-running processes vs ephemeral tabs).

**Target environments**: Node.js 18+, Bun, Deno. Uses runtime detection to adapt where APIs differ.

**Key responsibilities**:
- Use `@effect/platform` for runtime integration (filesystem, process lifecycle)
- Filesystem-based persistence (configurable database path)
- Worker Thread coordination for concurrent access patterns
- Inter-process coordination via Unix domain sockets or TCP (for multi-process deployments)
- Graceful shutdown on SIGTERM/SIGINT
- Optional cluster mode support for load-balanced deployments

### 3. React Native Runtime (`@effect-native/crsql-mesh-runtime-react-native`)

**Why separate**: React Native runs on mobile devices with native SQLite bindings (not WASM), platform-specific background modes, and unique inter-app coordination mechanisms (iOS App Groups, Android Content Providers). These are fundamentally different from both browser and server patterns.

**Target environments**: iOS and Android apps built with React Native, using libraries like `op-sqlite` or `expo-sqlite` for native SQLite access.

**Key responsibilities**:
- Native SQLite coordination (not WASM)
- Platform-specific background task scheduling (BackgroundFetch, WorkManager)
- Optional same-vendor cross-app sync via shared containers (iOS App Groups, Android shared storage)
- Handle app lifecycle (background, foreground, termination)
- Battery and network-aware sync scheduling

### 4. Electron Runtime

Out of scope.

## Why Not a Single "Universal" Adapter?

A single package that detects the runtime and loads appropriate code would seem simpler, but has significant downsides:

- **Bundle bloat**: Tree-shaking cannot remove platform code that might be needed at runtime. Browser bundles would include Node code and vice versa.

- **Dependency conflicts**: Platform-specific dependencies (OPFS polyfills, native SQLite bindings) conflict across environments.

- **Testing complexity**: A universal package must be tested across all platforms; separate packages can be tested in isolation.

- **Clearer mental model**: Developers explicitly choose their platform, making dependencies and capabilities obvious.

## Out of Scope

The following are explicitly **not** part of the runtime adapter packages:

- **Transport implementations**: Transports (WebSocket, WebRTC, IPC) are separate packages. Runtime adapters provide persistence and local coordination, not network transport.

- **The sync engine itself**: The anti-entropy loop, version vectors, and change application live in `@effect-native/crsql-mesh-core`. Runtime adapters wire platform capabilities into that engine.

- **Authentication and authorization**: Runtime adapters do not handle identity, tokens, or access control.

- **Application-level storage APIs**: These packages provide mesh infrastructure, not a general-purpose database API for application code. Application queries go through `@effect-native/crsql` or `@effect/sql`.

- **Platform detection magic**: Each package targets specific platforms explicitly. No runtime environment sniffing to pick an adapter — developers import the adapter they need.

- **Exotic platforms**: Initial scope covers browser, Node-like, and React Native. Edge Workers (Cloudflare, Vercel Edge), Tauri, and other platforms are deferred to future work.

- **SQLite build/distribution**: Runtime adapters assume SQLite (native or WASM) is available. They do not bundle or build SQLite themselves — that is `@effect-native/libcrsql`'s job.

## References

- Parent package map: [`../.specs/crsqlite-global-mesh-packages/instructions.md`](../crsqlite-global-mesh-packages/instructions.md)
- Global mesh proposal: [`../../../research/zig-cr/102-proposal-crsqlite-global-mesh.md`](../../../research/zig-cr/102-proposal-crsqlite-global-mesh.md)
- Core sync engine spec: [`../.specs/crsql-mesh/instructions.md`](../crsql-mesh/instructions.md)
