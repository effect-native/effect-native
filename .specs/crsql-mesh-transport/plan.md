# crsql-mesh-transport — Phase 4: Plan (RGRTDD)

This plan implements `@effect-native/crsql-mesh-transport` as a minimal Effect service plus a deterministic in-memory implementation for tests.

## A. Transport tag + interface

- A1 (RED) Add transport surface tests
  - Add `packages-native/crsql-mesh-transport/test/` tests that specify:
    - `Transport` is a `Context.Tag`
    - interface includes `open`, `close`, `send`, `receive`
    - operations fail with `TransportClosed` after close
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-transport`

- A2 (GREEN) Implement transport tag + error types
  - Implement `packages-native/crsql-mesh-transport/src/` exports:
    - `Transport` tag and service interface
    - `TransportClosed`, `PeerUnreachable`, `SendFailed`
  - Verification: targeted vitest

- A3 (REFACTOR) Export hygiene
  - Keep `src/index.ts` surface minimal
  - Verification: `pnpm -C effect-native build --filter "./packages-native/crsql-mesh-transport"`

## B. In-memory deterministic transport

- B1 (RED) Specify deterministic delivery
  - Tests specify:
    - two peers can be wired in-process
    - sends appear on the receiver’s `receive` stream
    - ordering is deterministic for tests
    - close causes the stream to end
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-transport`

- B2 (GREEN) Implement `InMemoryTransport`
  - Implement a constructor that can create multiple peers and connect them
  - Implement `receive` as a Stream of `{ from, payload }`
  - Verification: targeted vitest

- B3 (REFACTOR) Add a small harness API
  - Provide a small helper for tests to build a “mesh” of connected in-memory peers
  - Verification: targeted vitest
