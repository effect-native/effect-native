# @effect-native/test (SPI/DSL) — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Provide `TestRunner` service exposing `{ describe, it, expect, skip, only, todo, failing, each, prop }` and Effect helpers (`it.effect`, `it.scoped`, `it.live`).
- FR1.2: Provide minimal registration/builders to collect suites/tests; heavy runtime execution belongs in `@effect-native/test-core`.
- FR1.3: Support two exported test shapes: function(TestRunner) and parameterless Effect program.
- FR1.4: Define `TestEvent` protocol: `runStart`, `suiteStart`, `testStart`, `testEnd`, `suiteEnd`, `runEnd`, `log`.
- FR1.5: Provide `TestReporter` interface and reference reporters: dot, verbose, JSON.
- FR1.6: Provide optional `register(manifest)(registry)` convention for adapters to populate the registry.
- FR1.7: `TestRunner.expect` exposes the universal minimal Jest/Bun‑style assertion API to ensure portability across all adapters.

## NFR2 — Non‑Functional Requirements
- NFR2.1: No Node/RN/DOM globals; pure ESM modules.
- NFR2.2: Type safety: strict TS, no `as any` / unsafe double assertions; allow `as const`.
- NFR2.3: Effect patterns: allow `yield* new Error()`; forbid `try/catch` in `Effect.gen`.
- NFR2.4: Hard‑Fail: do not swallow initialization errors; surface missing environment/services.
- NFR2.5: Docgen examples compile; public APIs have JSDoc with `@example`.

## TC3 — Technical Constraints
- TC3.1: `effect@^3.17.11`; ESM; Node ≥ 18 for local tooling.
- TC3.2: No dependency on adapters; adapters depend on SPI. Shared runtime logic resides in `@effect-native/test-core` which depends on SPI.
- TC3.3: Property testing integrates with `fast-check` through adapter mapping (no hard dependency in SPI).

## DR4 — Data Requirements
- DR4.1: Precise TS types for suite/test nodes and events (status enums: pass|fail|skip|todo|failing|unknown).
- DR4.2: JSON reporter schema stable and documented; include version field.

## IR5 — Integration Requirements
- IR5.1: Provide minimal adapter hooks; delegate execution/scheduling, event protocol, reporters to `@effect-native/test-core` where applicable.
- IR5.2: Ensure TestRunner functions compose with `@effect/vitest` expectations semantics.
- IR5.3: Under Vitest/Bun, `TestRunner.expect` MAY delegate to the native `expect` if semantics align; otherwise use the universal implementation to avoid divergence.

## DEP6 — Dependencies
- DEP6.1: effect (runtime, TestServices types); no runtime deps beyond effect.

## SC7 — Success Criteria
- SC7.1: A demo suite defined via SPI runs unmodified on vitest, Bun, Browser, and RN adapters.
- SC7.2: JSON reporter output validates against schema across adapters.
