# crsql-mesh — Phase 4: Plan (RGRTDD)

This plan executes the `@effect-native/crsql-mesh` engine using Red → Green → Refactor loops, keeping each task small enough for a single atomic change.

## A. Package scaffolding + service surface

- A1 (RED) Add Mesh public surface tests
  - Add `packages-native/crsql-mesh/test/` tests that specify:
    - `Mesh` is a `Context.Tag`
    - `MeshLive` exists and is `Layer.scoped`
    - `Mesh` exposes the public capabilities described in `design.md`
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- A2 (GREEN) Add Mesh service skeleton
  - Add `packages-native/crsql-mesh/src/` with:
    - `Mesh` tag + service interface
    - `MeshConfig` (sync interval, max rows, backoff)
    - `MeshLive` layer (wires deps, no real loop yet)
  - Verification: `pnpm -C effect-native check` and `pnpm -C effect-native vitest packages-native/crsql-mesh`

- A3 (REFACTOR) Stabilize exports
  - Ensure `packages-native/crsql-mesh/src/index.ts` re-exports intended public API
  - Verification: `pnpm -C effect-native build --filter "./packages-native/crsql-mesh"`

## B. Deterministic orchestration with in-memory transport

- B1 (RED) Specify receive routing behavior
  - Tests describe that:
    - `Transport.receive` bytes are decoded via protocol
    - invalid messages result in `ProtocolError` and are dropped
    - valid messages are routed by `sender` / peer id
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- B2 (GREEN) Implement receive loop and routing
  - Implement receive fiber that:
    - consumes `Transport.receive`
    - decodes with protocol schemas
    - routes per peer
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- B3 (REFACTOR) Extract internal modules
  - Move routing into `src/internal/receive.ts` and peer bookkeeping into `src/internal/peer.ts`
  - Verification: `pnpm -C effect-native lint` and targeted vitest

## C. Version summaries + pull loop

- C1 (RED) Specify version vector state semantics
  - Tests specify:
    - version vector updates only after successful transactional apply
    - `versionVector` API returns a snapshot
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- C2 (GREEN) Add in-memory version vector state
  - Implement state container + update logic
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- C3 (RED) Specify summary exchange + diff request/response
  - Tests specify two-peer convergence behavior (using in-memory transport + DB test double)
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- C4 (GREEN) Implement periodic summary exchange + diff loop
  - Implement per-peer periodic loop driven by `syncInterval`
  - Implement `DiffRequest` generation when remote has newer versions
  - Implement `DiffResponse` generation in response to peer requests
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- C5 (REFACTOR) Keep loops scope-owned and interruptible
  - Ensure fibers are forked into the layer scope
  - Verification: add a test that closing scope stops fibers

## D. Transactional apply + observability

- D1 (RED) Specify transactional apply behavior
  - Tests specify:
    - apply happens inside one transaction
    - failure rolls back and yields `ApplyFailed`
    - successful apply advances version vector
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- D2 (GREEN) Implement apply pipeline
  - Implement `src/internal/apply.ts` using `@effect-native/crsql` helpers
  - Verification: targeted vitest

- D3 (RED) Specify db_version observation
  - Tests specify:
    - observers see advances caused by incoming applies
    - multiple observers can subscribe
  - Verification: targeted vitest

- D4 (GREEN) Implement progress stream / subscription
  - Implement a broadcast mechanism and expose it as part of `Mesh`
  - Verification: targeted vitest

## E. Integration evidence (real SQLite)

- E1 (RED) Add an integration test harness
  - Add a test that creates two real CR-SQLite DBs, connects via in-memory transport, and converges
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh`

- E2 (GREEN) Make integration test pass
  - Fill remaining wiring against `@effect-native/crsql`
  - Verification: same test

- E3 (REFACTOR) Final pass
  - Run `pnpm -C effect-native ok` if it's feasible; otherwise run: `pnpm -C effect-native lint` + `pnpm -C effect-native check` + package tests

## F. Browser Multi-Tab (crsqlite-web-multitab)

Reference: `research/zig-cr/96-proposal-multitab-wasm-sqlite-crsqlite.md`

Architecture summary:
- **Coordinator** (SharedWorker preferred, Service Worker fallback): elects provider, routes RPC
- **Provider** (dedicated Worker in elected tab): owns OPFS via `opfs-sahpool`, runs sqlite+crsqlite wasm
- **Clients** (tab main threads): proxy all DB calls through coordinator

### Spec phases (complete before implementation)

- F1 (SPEC) Phase 1 instructions for browser multi-tab
  - Add browser multi-tab context and goals to `effect-native/.specs/crsql-mesh/instructions.md`
  - Include: no OPFS corruption, no COOP/COEP requirement, all tabs benefit from warm cache
  - Verification: File updated with browser multi-tab section

- F2 (SPEC) Phase 2 requirements for browser multi-tab
  - Add EARS requirements to `effect-native/.specs/crsql-mesh/requirements.md`:
    - Coordinator election via Web Locks
    - Provider owns single OPFS connection
    - db_version notification broadcast
    - Service Worker fallback for missing SharedWorker
  - Verification: Review requirements.md has browser multi-tab EARS

- F3 (SPEC) Phase 3 design for browser multi-tab
  - Add design sketch to `effect-native/.specs/crsql-mesh/design.md`:
    - Coordinator responsibilities (election, routing, liveness detection)
    - Provider responsibilities (OPFS ownership, serial execution, notifications)
    - Client responsibilities (proxy, reconnection)
  - Verification: Review design.md has browser multi-tab section

- F4 (SPEC) Phase 4 plan slices for browser multi-tab
  - Refine implementation slices below based on approved design
  - Verification: This file has detailed RED/GREEN slices with test locations

### Implementation slices (blocked until spec approval)

- F5 (RED) Specify coordinator election behavior
  - Add tests to `packages-native/crsql-mesh/test/browser/coordinator.test.ts`
  - Tests describe: Web Lock election for provider, lock name `crsqlite:provider:<dbName>`
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh/test/browser` fails

- F6 (GREEN) Implement coordinator SharedWorker
  - Implement `packages-native/crsql-mesh/src/browser/coordinator.ts`
  - Uses Web Locks API, manages MessagePorts per client
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh/test/browser` passes

- F7 (RED) Specify provider worker OPFS ownership
  - Add tests describing: single provider owns OPFS, uses `opfs-sahpool` VFS
  - Tests describe: provider loads sqlite+crsqlite wasm, opens single connection
  - Verification: Tests fail

- F8 (GREEN) Implement provider dedicated worker
  - Implement `packages-native/crsql-mesh/src/browser/provider.ts`
  - Serial execution queue, OPFS access via `opfs-sahpool`
  - Verification: Tests pass

- F9 (RED) Specify db_version notification broadcast
  - Tests describe: provider broadcasts `{ dbName, dbVersion }` after writes
  - Tests describe: clients receive notifications through coordinator
  - Verification: Tests fail

- F10 (GREEN) Implement notification pathway
  - Provider queries `SELECT crsql_db_version()` after each write
  - Coordinator broadcasts to all connected clients
  - Verification: Tests pass

- F11 (RED) Specify Service Worker fallback
  - Tests describe: fallback when SharedWorker unavailable
  - Tests describe: same election + routing semantics via Service Worker
  - Verification: Tests fail

- F12 (GREEN) Implement Service Worker coordinator fallback
  - Implement `packages-native/crsql-mesh/src/browser/coordinator-sw.ts`
  - Only used for port bridging; no OPFS access from Service Worker
  - Verification: Tests pass

- F13 (RED) Specify provider migration on tab close
  - Tests describe: closing provider tab triggers re-election
  - Tests describe: clients reconnect automatically
  - Tests describe: idempotent write guard via `txId` prevents duplicate commits
  - Verification: Tests fail

- F14 (GREEN) Implement provider migration
  - Coordinator detects provider port disconnect
  - New provider elected, clients seamlessly reconnect
  - Write calls require `txId` for idempotency
  - Verification: Tests pass

- F15 (REFACTOR) Browser integration polish
  - Ensure all browser workers are tree-shakeable
  - Export clean public API from `packages-native/crsql-mesh`
  - Verification: `pnpm -C effect-native build --filter "./packages-native/crsql-mesh"`
