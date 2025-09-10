# @effect-native/test-vitest — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Provide a binding adapter that maps `@effect-native/test` exports to Vitest primitives: `describe`, `it`, `expect`.
- FR1.2: Implement `it.effect` by wrapping Effect programs with `it(name, () => Effect.runPromise(effect))`.
- FR1.3: Provide a setup module to integrate Effect equality with Vitest’s expect (e.g., via `@effect/vitest`).
- FR1.4: Default workflow uses Vitest native discovery; no manifest required. Optional manifest mode is supported via a generated entry if users opt in.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Keep adapter thin; no custom reporters in v0 — use Vitest’s reporters.
- NFR2.2: Do not break `pnpm vitest run`; after init, native command Just Works.
- NFR2.3: Fail fast on missing Vitest dependency with a clear remediation message.

## TC3 — Technical Constraints
- TC3.1: ESM config; Node ≥ 18.
- TC3.2: Peer dependencies: `vitest`, `effect`. Optional peer: `@effect/vitest` for equality helpers.

## DR4 — Data Requirements
- DR4.1: Minimal types re‑exported for the bound functions to satisfy TS users of `@effect-native/test`.

## IR5 — Integration Requirements
- IR5.1: Setup module wires equality testers and any necessary patching (non‑destructive).
- IR5.2: Optional CLI/script can generate a manifest entry `./.config/effect-native-test/manifest.vitest.test.ts` without changing the native command.

## DEP6 — Dependencies
- DEP6.1: `effect@^3.17.11` (peer), `vitest` (peer), `@effect/vitest` (peer optional).

## SC7 — Success Criteria
- SC7.1: Sample tests using `describe/it/expect` and `it.effect` pass under `pnpm vitest run`.
- SC7.2: Equality helpers enable useful comparisons for Effect types without extra user code.

