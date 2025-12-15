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
  - Run `pnpm -C effect-native ok` if it’s feasible; otherwise run: `pnpm -C effect-native lint` + `pnpm -C effect-native check` + package tests
