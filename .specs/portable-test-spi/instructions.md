# Portable Effect Test SPI — Phase 1 Instructions

## Overview

Define an implementation‑agnostic test specification and SPI (Service Provider Interface) so tests can be authored once (as Effect programs) and executed consistently across multiple runners (e.g., vitest, bun:test, React Native). The SPI standardizes test registration, execution semantics, metadata, timing, and event reporting, enabling thin adapters per runtime.

- Feature name: `portable-test-spi`
- Primary value: Write tests once; run on Node/vitest, Bun, and RN without code changes
- Scope: Test DSL + SPI interfaces, manifest format, event protocol, and conformance rules

Implementation Order:
- Phase A: vitest + bun:test adapters
- Phase B: browser adapter
- Phase C: React Native adapter

Package Names:
- Generic SPI/DSL: `@effect-native/test`
- Adapters: `@effect-native/test-vitest`, `@effect-native/test-bun`, `@effect-native/test-browser`, `@effect-native/test-react-native`

## Personas & User Stories

1) Library Author — “One suite, many runtimes”
- I want to define tests in Effect once and run them under vitest, bun:test, and React Native without forking/mocking.

2) Platform Integrator — “Adapter not rewrite”
- I want to implement a small adapter for each runtime that understands the SPI and faithfully executes tests with consistent semantics.

3) CI Owner — “Deterministic semantics”
- I want clearly defined behavior (timeouts, skip/only, flaky markers, property tests) so CI behaves the same across runners.

4) App Developer — “Legit product, one standard, no yak‑shaving”
- I want a single standard way to write tests that clearly state my product requirements using Effect, without dicking around with testing infrastructure. I want fast, trustworthy feedback that my requirements are met across environments.

5) App Developer — “Use RN testing tools I already know”
- I want to use libraries like `@testing-library/react-native` in RN‑specific tests without jumping through hoops or custom wrappers. Portable tests remain platform‑agnostic; RN‑specific tests can directly import RN and its testing tools.

## Core Requirements

- Test DSL and SPI:
  - Provide a minimal test registration API (name, body, timeout) returning an Effect.
  - Support modifiers: `skip`, `only`, `todo`, `failing`, `each`, and property tests (`prop`).
  - Provide deterministic time via Effect TestClock integration guidance.
  - Emphasize requirement‑oriented tests: tests are executable requirements (preconditions, actions, expectations) expressed as Effects with precise error channels.
  - Express platform/runtime requirements using standard Effect mechanisms (environment `R`, Layers, and service imports) — no new capability metadata or DSL extensions.

- Service interfaces:
  - `TestRuntime` Effect.Service that executes registered tests, manages lifecycle, and emits structured events.
  - `TestReporter` interface consuming events and producing human/JSON outputs.

- Manifest & discovery:
  - Standard manifest module that imports test files and calls registration APIs; adapters load this manifest.
  - Conventions for file globs and explicit manifest generation.
  - No custom capability metadata in the manifest; selection/requirements are implicit via imports and required services.

- Event protocol:
  - Standardize events: `runStart`, `suiteStart`, `testStart`, `testEnd`, `suiteEnd`, `runEnd`, plus `log`.
  - Include timing, status, error details (stack, cause), annotations.

- Cross‑runtime conformance:
  - Define required semantics for timeouts, retries (future), and environment provision (TestServices).
  - Forbid Node‑only globals in portable tests; environment specifics belong in adapters.
  - Requirements are expressed through the Effect environment and module imports. If a selected test cannot be imported (e.g., references RN modules on Node) or requires services the adapter does not provide, the run MUST fail loudly (Hard‑Fail), not silently skip.

## Technical Specifications

- Packages/Modules (initial):
  - `@effect-native/test`: exports types, `TestRunner` service, registration helpers, and the portable DSL.
  - Core types: `TestCase`, `TestSuite`, `TestEvent`, `TestRuntime`, `TestReporter`.
  - Registration helpers build an in‑memory model consumable by any adapter.

- DSL shape (illustrative):
  - `describe(name, fn)`, `it(name, effect, timeout?)`, plus `skip/only/todo/failing/each/prop` variants.
  - Implemented as pure builders that append to a `TestRegistry` rather than coupling to a specific runner.
  - Effect helpers compatible with `@effect/vitest` patterns (e.g., `it.effect`, `it.scoped`, `it.live`) to make authoring natural for Effect users.

- Effects & errors:
  - Modern Effect v3.17+ patterns allowed: `return yield* new MyError(...)`.
  - No `try/catch` within `Effect.gen` generators; use Effect error channels.

- Manifest format:
  - Default export `register()` that registers all tests into a provided `TestRegistry`.
  - Adapters call `await manifest.register(registry)` then execute via their runtime.
  - No custom capability metadata is attached; tests remain plain modules. Requirements are conveyed by the Effect environment and imports.

- Test file contract and discovery:
  - Test files match: `**/*.test.{js,jsx,ts,tsx}` (ESM).
  - Export shapes supported:
    - Function form: default/named functions that receive the `TestRunner` instance as the first (and only) argument.
    - Effect form: default/named `Effect` programs (no parameters). Adapters run these Effects by providing the environment.
  - The `TestRunner` instance exposes `{ describe, it, expect, ... }` including Effect‑aware helpers (`it.effect`, etc.).
  - Suggested import for types/helpers: `import * as TestRunner from "@effect-native/test/TestRunner"` (types/subpath subject to final API surface design).
  - Platform‑specific requirements are naturally encoded by importing the adapter‑specific services (e.g., `@effect-native/test-bun` or `@effect-native/test-react-native`) and yielding them from Effects.

## Acceptance Criteria

- Author a small demo suite once; run it under:
  - A vitest adapter (Node) and an RN adapter, without changing test code.
- Event protocol stable and identical across adapters (modulo platform timings).
- Tests do not assume Node globals; adapter provides any needed platform services.
- Repository validations pass: `pnpm ok`, lint, typecheck, docgen, build.
 - RN‑specific test can import and use `@testing-library/react-native` directly when run under the RN adapter (no custom wrappers). If the package is missing while such a test is selected, the run fails loudly.
 - Example module forms supported:
   - `scratchpad/scratch.test.ts`: default function receiving `TestRunner` executes under any adapter.
   - `scratchpad/needs-bun.test.ts`: default exported Effect requiring `@effect-native/test-bun` executes under Bun and fails loudly on other adapters.

## Out of Scope (v1)

- Snapshot testing semantics.
- Coverage metrics and Istanbul integration.
- Parallelism/worker protocols; v1 assumes serial execution per adapter.

## Success Metrics

- Single test suite runs on at least two adapters with no code changes.
- Stable event protocol adopted by both adapters.
- Clear, minimal adapter surface making new runtimes straightforward to add.

## Future Considerations

- Snapshot spec and serializers.
- Retry/flaky policy standardization.
- Parallel execution model and sharding.
- Rich metadata for test annotations and links.

## Testing Requirements

- Unit tests:
  - Registry semantics, modifiers, and manifest generation.
  - Event protocol serialization and reporter formatting.

- Integration tests:
  - Run the same suite through two adapters (Node and RN) and compare event streams (allowing for timing variance).

- Validation (inside Nix):
  - `nix develop --command pnpm ok`
  - `nix develop --command pnpm test` (SPI unit/integration tests only)
  - `nix develop --command pnpm docgen` and `pnpm check`
