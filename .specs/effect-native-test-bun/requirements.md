# @effect-native/test-bun — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Provide a binding adapter that maps `@effect-native/test` exports to Bun’s `bun:test` primitives: `describe`, `it`, `expect`.
- FR1.2: Implement `it.effect` by wrapping Effect programs with `it(name, () => Effect.runPromise(effect))`.
- FR1.3: Provide a preload module to integrate Effect equality with Bun’s expect (non‑destructive).
- FR1.4: Default workflow uses Bun native discovery; no manifest required. Optional manifest mode is supported via a generated entry if users opt in.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Keep adapter thin; no custom reporters in v0 — use Bun’s reporters.
- NFR2.2: Do not break `bun test`; after init, native command Just Works.
- NFR2.3: Fail fast on missing Bun runtime with a clear remediation message.

## TC3 — Technical Constraints
- TC3.1: Bun latest stable; `bunfig.toml` optional.
- TC3.2: Peer dependencies: `effect`; relies on Bun’s built‑in test runner.

## DR4 — Data Requirements
- DR4.1: Minimal types re‑exported for the bound functions to satisfy TS users of `@effect-native/test`.

## IR5 — Integration Requirements
- IR5.1: Preload wires equality testers and any necessary extensions (non‑destructive).
- IR5.2: Optional CLI/script can generate a manifest entry `./.config/effect-native-test/manifest.bun.test.ts` without changing the native command.
- IR5.3: Execution semantics mirror the Vitest adapter: wrap Effect tests with a runPromise‑like helper, ensure fibers are interrupted/cancelled when the test completes, and optionally provide a TestEnv for `it.effect`/scoped helpers.

## DEP6 — Dependencies
- DEP6.1: `effect@^3.17.11` (peer), Bun runtime.

## SC7 — Success Criteria
- SC7.1: Sample tests using `describe/it/expect` and `it.effect` pass under `bun test`.
- SC7.2: Equality helpers enable useful comparisons for Effect types without extra user code.
