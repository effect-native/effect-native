# @effect-native/test-service — Phase 1 Instructions

## Overview

Unified, portable testing system for Effect-based projects consisting of:
- A generic, implementation‑agnostic SPI/DSL (`@effect-native/test`) for defining tests once as Effect programs.
- Adapters that integrate with existing runners without replacing them:
  - `@effect-native/test-vitest` (Node + vitest)
  - `@effect-native/test-bun` (Bun + bun:test)
  - `@effect-native/test-browser` (real browser via Playwright/Puppeteer)
  - `@effect-native/test-react-native` (real RN runtime via Metro + simulator/emulator)
  - Shared core used by Browser/RN: `@effect-native/test-core` (executor, events, reporters, manifest/transport helpers)

Goals: Write tests once, run them across Node, Bun, Browser, and React Native with consistent semantics, zero custom mock environments, and fail‑fast behavior.

- Feature name: `test-service`
- Primary value: One standard to author requirement‑oriented tests in Effect; adapters integrate with native runners for real runtime execution.
- Hard‑Fail: Never hide misconfigurations or missing deps behind optional guards; fail loudly with remediation guidance.
- Nix dev shell (dev/CI only): In this repository we run install/build/test inside `nix develop` for reproducibility. Published packages/adapters MUST run for end users without Nix, using their standard Node/Bun environments.

Implementation Order:
- Phase A: vitest + bun:test adapters
- Phase B: browser adapter
- Phase C: React Native adapter

Package Names:
- SPI/DSL: `@effect-native/test`
- Core: `@effect-native/test-core`
- Adapters: `@effect-native/test-vitest`, `@effect-native/test-bun`, `@effect-native/test-browser`, `@effect-native/test-react-native`

## Personas & User Stories

1) Library Author — “One suite, many runtimes”
- Author tests once in Effect; run under vitest, bun:test, Browser, and RN without forking or mocking.

2) Platform Integrator — “Adapter not rewrite”
- Implement a small adapter per runtime that consumes the SPI and preserves consistent semantics.

3) CI Owner — “Deterministic, fail‑fast”
- Clearly defined timeouts, modifiers, property tests; loud failures for missing tools/deps; Nix ensures reproducibility.

4) App Developer — “Legit product, one standard, no yak‑shaving”
- Single standard to write requirement‑oriented tests in Effect; fast, trustworthy feedback across environments without fiddling with infra.

5) App Developer — “Use tools I know on RN”
- In RN, use `react-native` and `@testing-library/react-native` directly—no custom wrappers or hoops.

## Core Requirements

- Test DSL & SPI (`@effect-native/test`):
  - Minimal, Effect‑centric registration API and helpers: `describe`, `it`, modifiers (`skip`, `only`, `todo`, `failing`, `each`), property tests (`prop`), and Effect helpers (`it.effect`, `it.scoped`, `it.live`).
  - Deterministic time guidance via Effect TestClock.
  - Requirement‑oriented tests: encode preconditions, actions, and expectations as Effects with precise error channels.
  - Express runtime requirements via existing Effect mechanisms (environment `R`, Layers, imported services); no new capability metadata or DSL.

- Test entry contract & discovery (all adapters):
  - Discover `**/*.test.{js,jsx,ts,tsx}` (ESM).
  - Two supported export shapes:
    1) Function form — exported function receives a `TestRunner` instance (`{ describe, it, expect, ... }`).
    2) Effect form — exported Effect program (no parameters) that the adapter runs by providing the environment.
  - Example alignment:
    - `scratchpad/scratch.test.ts`: default exported function consuming `TestRunner`.
    - `scratchpad/needs-bun.test.ts`: default exported Effect that yields `@effect-native/test-bun` services; runs on Bun, fails elsewhere.

- Event protocol & reporting:
  - Standardized events: `runStart`, `suiteStart`, `testStart`, `testEnd`, `suiteEnd`, `runEnd`, `log` with timing, status, and error details.
  - Reporters: dot, verbose, JSON; non‑zero exit on any failure.

- Cross‑runtime conformance:
  - Portable tests must not assume Node/RN/DOM globals; adapters provide platform specifics.
  - If imports/services are missing for a selected test, adapters MUST fail loudly (no silent skips).

## Technical Specifications

- SPI/DSL package (`@effect-native/test`):
  - Exports: `TestRunner` service, `TestRuntime`, `TestReporter`, `TestCase`, `TestSuite`, `TestEvent`, and registration helpers.
  - Implementation uses modern Effect patterns (v3.17+): allow `yield* new Error()`, forbid `try/catch` in generators, no unsafe `as any`.
  - Manifest API: a conventional manifest module can `register(registry)` to collect tests; adapters may generate or load a manifest.
  - Suggested type import for authors: `import * as TestRunner from "@effect-native/test/TestRunner"`.

- Vitest adapter (`@effect-native/test-vitest`):
  - Integration, not replacement: map SPI-registered tests to real vitest `describe/it` (prefer `@effect/vitest`).
  - Manifest strategy:
    - CLI generates `./.effect-test/manifest.vitest.test.ts` that imports discovered test modules and registers them via `TestRunner` into vitest.
    - Option B: vitest plugin/setup provides a virtual module (e.g., `virtual:effect-test-manifest`) auto‑loaded via `setupFiles`.
  - Property tests map to `fast-check` or run an internal property loop and emit a single vitest test.
  - Setup integrates `@effect/vitest` equality helpers.

- Bun adapter (`@effect-native/test-bun`):
  - Integration with Bun’s `test` API, aligning with `@effect-native/bun-test` patterns.
  - Manifest strategy:
    - CLI generates `./.effect-test/manifest.bun.test.ts` that imports discovered modules and registers tests using `TestRunner` -> Bun `test`.
    - Run with `bun test ./.effect-test/manifest.bun.test.ts` to avoid duplicate discovery.
    - Optional `bunfig.toml`:
      ```toml
      [test]
      preload = ["@effect-native/test-bun/preload"]
      root = ".effect-test"
      ```
    - Preload sets up TestServices and equality helpers; MUST NOT hide missing deps (Hard‑Fail).

- Browser adapter (`@effect-native/test-browser`):
  - Real browser execution (Chromium first) using a harness page and headless automation (Playwright/Puppeteer).
  - Bundle the manifest for the browser (Vite/esbuild/rollup); establish a WS/bridge to stream events to the host.
  - Import discovered test modules; for each export: call function with `TestRunner` or run exported Effect with provided env.
  - Fail loudly if browser‑specific imports/services are missing.
  - MUST reuse `@effect-native/test-core` executor, event protocol, reporters, and transport helpers.

- React Native adapter (`@effect-native/test-react-native`):
  - Real RN runtime (Hermes preferred, JSC acceptable). Bundle via Metro, launch simulator/emulator, stream events over WS.
  - Import discovered modules; call function exports with `TestRunner` or run exported Effects with provided env.
  - RN‑specific tests can directly use `react-native` and `@testing-library/react-native`; fail loudly if missing.
  - CLI flags: `--platform ios|android`, `--device <name/id>`, `--include/--exclude`, `--reporter`, `--timeout`.
  - MUST reuse `@effect-native/test-core` executor, event protocol, reporters, and transport helpers.

- Environment & Tooling:
  - Development/CI in this repo uses Nix: `nix develop --command <cmd>`.
  - End users do not need Nix; adapters/CLIs run under standard Node/Bun with required platform SDKs where applicable.
  - CI uses separate jobs per adapter/platform; exclude unsupported jobs rather than weakening tests.

## Acceptance Criteria

Stage A — vitest + bun:
- Same portable suite runs under vitest (Node) and bun:test; identical pass/fail outcomes and correct exits.
- Works with and without local `bunfig.toml` (CLI can pass `--preload`).
- Fail‑loud if runtime‑specific imports/services are missing.

Stage B — browser:
- Portable suite runs headless in Chromium; event streams match Node/Bun modulo timing.
- Console/error forwarding visible; fail‑loud on missing browser deps.

Stage C — React Native:
- Portable suite runs on iOS Simulator and Android Emulator; parity with Node/Bun modulo timing.
- RN API test (e.g., `Dimensions.get("window")`) passes without mocks.
- RN tests can use `@testing-library/react-native` directly; fail‑loud if missing.

Repo gates (all stages):
- `nix develop --command pnpm ok` green (outside intentional RED in TDD), plus lint, typecheck, docgen, build.

## Out of Scope (v1)

- Snapshots and coverage instrumentation.
- Watch mode and multi‑device parallelism.
- Physical device orchestration (USB).
- RN Web/Expo; advanced browser matrix flake mitigation.

## Success Metrics

- Identical pass/fail semantics across adapters for portable tests.
- CI durations: Node/Bun ≤ ~5 min; Browser ≤ ~7 min; RN ≤ ~10 min (post‑cache).
- Flake rate < 1% for v1 scope.

## Future Considerations

- Watch mode with incremental bundling; snapshot serializers; coverage.
- Parallelization & sharding; richer metadata/annotations.
- Flipper plugin (RN) and improved browser/RN developer UIs.

## Testing Requirements

- SPI unit tests: registry semantics, modifiers, manifest generation; event protocol serialization; reporter formatting.
- Adapter unit tests: mapping from SPI to native runner (modifiers, property tests, reporters).
- E2E parity tests: run the same suite under vitest and Bun (Stage A), then Browser (Stage B), then RN (Stage C) and compare event streams (allow timing variance).
- Validation (inside Nix): `pnpm ok`, targeted `pnpm test`, `pnpm docgen`, `pnpm check`.

## Guardrails & Policies Alignment

- Hard‑Fail Policy: Do not add guards that silence or skip tests due to missing deps/runtimes; fail loudly with remediation.
- Evidence‑First: Document reproduction commands and environment setup for each adapter.
- Type Assertions Policy: Avoid unsafe assertions; `as const` allowed. No `as any` or double assertions without explicit, reviewed justification.
- Modern Effect Patterns: Allow `yield* new Error()`; forbid `try/catch` in `Effect.gen`.
- Nix Dev Environment: For this repository's development and CI, run inside `nix develop` to avoid ABI/version mismatches (e.g., native addons). End users of the published packages/adapters are not required to use Nix.

---

This combined Instructions spec supersedes earlier per‑adapter Instructions for Phase 1. We will break out into separate specs at Phase 2 (Requirements):
- Create `requirements.md` for:
  - `@effect-native/test` (SPI/DSL)
  - `@effect-native/test-vitest` + `@effect-native/test-bun`
  - `@effect-native/test-browser`
  - `@effect-native/test-react-native`
- Optionally keep a top‑level `test-service/requirements.md` to capture cross‑cutting constraints and shared success criteria.
