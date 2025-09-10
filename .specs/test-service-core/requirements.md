# @effect-native/test-core — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Provide shared runtime primitives used by Browser and RN adapters: TestRegistry, scheduler/executor, suite tree, and lifecycle hooks.
- FR1.2: Define and export the canonical Test Event protocol and JSON reporter implementation(s) used across adapters.
- FR1.3: Provide portable reporters (dot, verbose, JSON) and formatting utilities.
- FR1.4: Provide manifest generation helpers (programmatic API) to import discovered modules and normalize exported shapes (function(TestRunner) vs Effect).
- FR1.5: Provide transport message schema and utilities for host<->runtime bridges (WS) used by Browser and RN.
- FR1.6: Expose minimal adapter SDK helpers (e.g., mapExports(module) → Array<TestCaseDef>) to keep adapters thin.
 - FR1.7: Provide compatibility shim modules for common runner APIs to enable no‑export tests in Browser/RN:
   - `@effect-native/test-core/compat/vitest` (exports describe/it(test)/hooks/expect)
   - `@effect-native/test-core/compat/effect-vitest` (compatible subset of `@effect/vitest`)
   - `@effect-native/test-core/compat/bun-test` (exports test/describe/expect/hooks)
   These forward to the SPI `TestRunner`.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Pure ESM, no Node/RN/DOM globals; side‑effect free entry points.
- NFR2.2: Type safety: strict TS, no `as any` / unsafe double assertions; allow `as const`.
- NFR2.3: Effect patterns: allow `yield* new Error()`; forbid `try/catch` in `Effect.gen`.
- NFR2.4: Hard‑Fail: never swallow adapter/runtime initialization errors.

## TC3 — Technical Constraints
- TC3.1: Target Node ≥ 18 for host utilities; runtime side must also build for browser/RN bundles.
- TC3.2: No dependency on specific runners; adapters depend on core, not vice versa.
 - TC3.3: Compat layers are tree‑shakeable and only brought in via bundler/Metro aliases for Browser/RN builds.

## DR4 — Data Requirements
- DR4.1: Canonical `TestEvent` TS types and a versioned JSON schema for reporter output.
- DR4.2: Transport message types for Browser/RN (start, progress, end, log, error).

## IR5 — Integration Requirements
- IR5.1: Browser and RN adapters MUST use core’s scheduler/executor, event protocol, and reporters.
- IR5.2: Vitest and Bun adapters MAY bypass scheduler/executor and rely on native runners, but SHOULD reuse event protocol types and JSON reporter when emitting SPI events.
- IR5.3: Provide small adapter SDK functions to reduce duplication across adapters.

## DEP6 — Dependencies
- DEP6.1: `@effect-native/test` (SPI types and TestRunner interface).
- DEP6.2: `effect@^3.17.11`.

## SC7 — Success Criteria
- SC7.1: Browser and RN adapters share core executor/reporters with minimal glue code.
- SC7.2: Vitest and Bun adapters compile against core’s types and can optionally emit core‑compatible JSON reports.
- SC7.3: No duplicated scheduler/executor logic across adapters.
