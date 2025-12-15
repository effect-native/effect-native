# crsql-mesh-runtime-node — Phase 4: Plan (RGRTDD)

This plan implements `@effect-native/crsql-mesh-runtime-node` as a narrow adapter that wires platform lifecycle + filesystem persistence into the mesh engine.

## A. Runtime configuration + surface

- A1 (RED) Add runtime surface tests
  - Add `packages-native/crsql-mesh-runtime-node/test/` tests that specify:
    - `NodeRuntimeLive` exists
    - it validates `databasePath` and fails with `DatabasePathInvalid` when unusable
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-runtime-node`

- A2 (GREEN) Add runtime skeleton
  - Add `packages-native/crsql-mesh-runtime-node/src/` with:
    - config model (`databasePath`, `shutdownTimeout`)
    - error types (`DatabasePathInvalid`, `ShutdownTimeout`)
    - `NodeRuntimeLive` as `Layer.scoped`
  - Verification: `pnpm -C effect-native check` and targeted vitest

## B. Database wiring

- B1 (RED) Specify database open behavior
  - Tests specify:
    - database is opened at `databasePath`
    - CR-SQLite extension is loaded
    - protocol layer initialization is required and `UnhexUnavailable` fails the runtime
  - Verification: targeted vitest

- B2 (GREEN) Implement DB open + protocol init
  - Wire `@effect-native/crsql` + `@effect-native/crsql-mesh-protocol`
  - Provide the db connection service required by `crsql-mesh`
  - Verification: targeted vitest

## C. Process lifecycle + shutdown

- C1 (RED) Specify SIGINT/SIGTERM shutdown
  - Tests specify:
    - on signal, mesh fibers are stopped and DB is closed
    - shutdown is bounded by `shutdownTimeout`
  - Verification: targeted vitest

- C2 (GREEN) Implement lifecycle hooks
  - Use `@effect/platform` lifecycle APIs to register signal handlers in scope
  - Ensure shutdown is performed via scope closure + timeout
  - Verification: targeted vitest

- C3 (REFACTOR) Narrow responsibilities
  - Ensure runtime does not select transports or topology
  - Verification: `pnpm -C effect-native lint` and targeted vitest
