# crsql-mesh-protocol — Phase 4: Plan (RGRTDD)

This plan implements `@effect-native/crsql-mesh-protocol` using Schema-first encoding/decoding, with a hard failure when SQLite `unhex()` is unavailable.

## A. Message models + schemas

- A1 (RED) Add protocol schema tests
  - Add `packages-native/crsql-mesh-protocol/test/` tests that specify:
    - `VersionSummary`, `DiffRequest`, `DiffResponse`, `MeshMessage` decode valid payloads
    - invalid payloads produce a typed decode error surfaced as `ProtocolError`
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-protocol`

- A2 (GREEN) Implement schema definitions
  - Implement `packages-native/crsql-mesh-protocol/src/` exports:
    - message model types
    - Effect Schema definitions
    - encode/decode helpers
  - Reuse `@effect-native/crsql/CrSqlSchema` shapes as required
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-protocol`

- A3 (REFACTOR) Tighten public exports
  - Ensure `src/index.ts` exposes only intended surface
  - Verification: `pnpm -C effect-native build --filter "./packages-native/crsql-mesh-protocol"`

## B. Layer initialization + unhex() capability check

- B1 (RED) Specify `unhex()` check behavior
  - Tests specify:
    - creating the protocol layer executes a capability check query
    - missing/disabled `unhex()` fails with `UnhexUnavailable`
  - Verification: `pnpm -C effect-native vitest packages-native/crsql-mesh-protocol`

- B2 (GREEN) Implement protocol layer
  - Implement a `Layer.scoped` (or equivalent) that:
    - requires a database connection capability
    - performs the `unhex()` check once at layer acquisition
  - Verification: targeted vitest

- B3 (REFACTOR) Make failures crisp
  - Ensure the error types are stable and surfaced without wrapping noise
  - Verification: targeted vitest

## C. Interop + roundtrip safety

- C1 (RED) Add roundtrip tests
  - Tests specify that encoding then decoding a message yields equivalent structure
  - Verification: targeted vitest

- C2 (GREEN) Implement roundtrip helpers
  - Add helpers intended for `crsql-mesh` to do validation + decode in one step
  - Verification: targeted vitest

- C3 (REFACTOR) Keep schemas single-source
  - Ensure the schema definitions are the only source of validation logic
  - Verification: `pnpm -C effect-native lint` and targeted vitest
