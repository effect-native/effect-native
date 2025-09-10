# @effect-native/test — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Export bindings for `describe`, `it`, `expect` that map to the active runner or harness; do not implement a new runner or assertion engine.
- FR1.2: Provide Effect helpers on `it`: `it.effect` (run Effect via `Effect.runPromise`), plus placeholders for `it.scoped` and `it.live` to add later.
- FR1.3: Provide a tiny SPI for adapters to supply the bound primitives (e.g., `bind(): { describe, it, expect }`).
- FR1.4: Ship an optional ambient types template (`test-env.d.ts`) so tests can use global `describe`/`it`/`expect` types without imports.

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
- IR5.1: Works with `@effect-native/test-vitest` and `@effect-native/test-bun` adapters by re‑exporting their bound primitives.
- IR5.2: Provides a minimal adapter hook (`setBindings` or equivalent) that Browser/RN harnesses can call during bootstrap.

## DEP6 — Dependencies
- DEP6.1: `effect@^3.17.11`.

## SC7 — Success Criteria
- SC7.1: Authoring example compiles and runs unchanged under vitest and bun using adapter packages.
- SC7.2: `it.effect` properly propagates Effect failures as test failures in both runners.

