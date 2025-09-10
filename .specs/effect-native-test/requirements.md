# @effect-native/test — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Define an Effect Service `TestApi` providing `{ it, expect }` abstractions sourced from the active runner or harness; do not implement a new runner or assertion engine.
- FR1.2: Provide Effect helpers: `itEffect(name, Effect)` that reads `TestApi` from the environment and runs with `Effect.runPromise`. Leave `scoped`/`live` for later.
- FR1.3: Ship an optional ambient types template (`test-env.d.ts`) so tests can use global `describe`/`it`/`expect` types without imports; adapters may extend the runner’s `it` with an `effect` method in setup/preload.

## NFR2 — Non‑Functional Requirements
- NFR2.1: “No new runner” guarantee — this package does not schedule tests or create globals at runtime.
- NFR2.2: Type‑safe API; no `as any`; prefer inference; allow `as const`.
- NFR2.3: Modern Effect patterns (v3.17+); forbid `try/catch` in generators.

## TC3 — Technical Constraints
- TC3.1: ESM‑first, Node ≥ 18 for development; runtime portable across Node/Bun/Browser/RN via adapters.
- TC3.2: No hard dependency on vitest/bun/runners; adapters depend on this package.
- TC3.3: No built‑in assertion implementation; `expect` is provided by the adapter’s runner/harness.

## DR4 — Data Requirements
- DR4.1: Public types for the bindings and `it.effect` signatures.
- DR4.2: Optional `test-env.d.ts` template content documented for init scripts.

## IR5 — Integration Requirements
- IR5.1: Adapters provide `Layer<TestApi>` sourced from the underlying runner (Vitest/Bun) or harness (Browser/RN).
- IR5.2: Helper functions in this package read `TestApi` via Effect.provide to run Effect‑based tests.
- IR5.3: Semantics alignment: mirror `packages/vitest/src/internal/internal.ts` patterns (runPromise/exit handling, interrupt fibers on test finish, optional TestEnv provisioning) within adapter layers.

## DEP6 — Dependencies
- DEP6.1: `effect@^3.17.11`.

## SC7 — Success Criteria
- SC7.1: Authoring example compiles and runs unchanged under vitest and bun using adapter packages.
- SC7.2: `it.effect` properly propagates Effect failures as test failures in both runners.
