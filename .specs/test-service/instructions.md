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

## Integration

- Quick init:
  - Run: `pnpm dlx github:effect-native/test --init`
  - Creates `test-env.d.ts` with ambient type declarations for `describe`, `it`, `expect`, hooks, and Effect helpers (e.g., `it.effect`).
  - Updates your TypeScript config include if needed so tests compile without importing `describe`/`it`/`expect`.
- Runtime globals:
  - Node/Vitest and Bun provide these at runtime already.
  - Browser/RN harness will bind `describe`/`it`/`expect` at runtime to match the ambient types (via Jasmine by default). No new runner is introduced; we bind to existing engines.

- Runner selection (prompted):
  - The init prompts you to select one or more runners to configure now: `vitest`, `bun:test`, `browser`, `react-native`.
  - For each selection, it scaffolds minimal, non-destructive config and a package.json script.

- Per‑runner scaffolding (what `--init` sets up):
  - Vitest:
    - Native default: nothing breaks `pnpm vitest run` — it Just Works with native discovery.
    - Ensures `vitest.config.ts` includes a setup file to wire Effect equality (e.g., `@effect-native/test-vitest/setup`).
    - Optional: adds `test:vitest:manifest` and generates `./.config/effect-native-test/manifest.vitest.test.ts` if you opt into manifest mode.
  - Bun:
    - Native default: nothing breaks `bun test` — it Just Works with native discovery.
    - Creates/updates `bunfig.toml` with `[test].preload = ["@effect-native/test-bun/preload"]` to install equality helpers (non‑destructive).
    - Optional: adds `test:bun:manifest` and generates `./.config/effect-native-test/manifest.bun.test.ts` if you opt into manifest mode (does not change `bun test`).
  - Browser:
    - Adds `test:browser` script(s): headless (Playwright Chromium) and serve mode.
    - Generates a minimal harness (Jasmine by default) and a Vite config under `./.config/effect-native-test/browser/`.
    - Emits a manifest that imports your tests and calls into the harness `run()`.
  - React Native:
    - Adds `test:rn` scripts (e.g., `ios`/`android` variants).
    - Generates a minimal RN harness (Jasmine default) and Metro config stubs under `./.config/effect-native-test/rn/`.
    - If an Expo Router app is detected, also scaffolds a `__DEV__`-only route under your Expo Router `app/` folder (e.g., `app/__tests/index.tsx`) that mounts the RN test harness. The route is only active in development and is excluded from production builds.
    - Creates a Maestro flow at `./.config/effect-native-test/maestro/run.yaml` that opens the app via deep link to the test route for iOS and Android. You can run it in CI or locally after the app is installed.
    - Leaves device selection to CLI flags; no mocking of native modules.

## Runner Landscape (Browser‑Native)

- Mocha: Browser‑ready BDD/TDD; needs an assertion lib (commonly Chai). Mature and flexible.
- Jasmine: Self‑contained describe/it/expect; browser‑first; minimal shims.
- QUnit: Simple, browser‑native; assertion API differs (wrap if needed).
- Web Test Runner: Modern harness to run tests in real browsers; Mocha‑syntax by default.
- Intern: Enterprise runner; browser + Node; heavier.
- Karma (launcher): Pairs with Mocha/Jasmine to drive real browsers.
- Tape / uvu / zora: Small, TAP‑style; can run in browsers with bundling; wrap to expose BDD names.
- E2E (Cypress/Playwright Test): Bring own runner; not a fit for in‑app RN.

Recommendation for in‑app Browser/RN adapters: prefer Jasmine (standalone) as default; provide Mocha + Chai as an alternative binding.

## RN Hermes Feasibility (Ranked)

1) Jasmine (standalone): builtin expect; no DOM/Node required; minimal shims.
2) Mocha (core) + Chai: works with small `process.nextTick`/`performance.now` shims; avoid HTML reporter.
3) Zora (ESM): tiny TAP‑like; wrap to BDD if desired.
4) QUnit: runs without Node; wrap to BDD labels if desired.

Avoid trying to embed Vitest/Jest/Bun’s runner inside Hermes; they assume Node worker/process/fake‑timers internals.

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

- No new runner: bind to existing engines per environment. SPI exposes describe/it/expect as bindings, not an engine.
- Authoring ergonomics: with `test-env.d.ts`, authors may omit imports and use global names in tests. Under the hood, Node/Bun runners supply these; Browser/RN harness binds them at runtime to the embedded engine.

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
  - Exports: `describe`, `it`, `expect` bindings (re‑exported from the active adapter), plus Effect helpers (`it.effect`, `it.scoped`, `it.live`). Also `TestRunner` service, `TestRuntime`, `TestReporter`, `TestCase`, `TestSuite`, `TestEvent`, and registration helpers.
  - Implementation uses modern Effect patterns (v3.17+): allow `yield* new Error()`, forbid `try/catch` in generators, no unsafe `as any`.
  - Manifest API: a conventional manifest module can `register(registry)` to collect tests; adapters may generate or load a manifest.
  - Authoring imports: `import { describe, it, expect } from "@effect-native/test"` (no globals). Effect helpers come from the same import.

- Vitest adapter (`@effect-native/test-vitest`):
  - Integration, not replacement: map SPI-registered tests to real vitest `describe/it` (prefer `@effect/vitest`).
  - Manifest strategy:
    - CLI generates `./.config/effect-native-test/manifest.vitest.test.ts` that imports discovered test modules and registers them via `TestRunner` into vitest.
    - Option B: vitest plugin/setup provides a virtual module (e.g., `virtual:effect-native-test-manifest`) auto‑loaded via `setupFiles`.
  - Property tests map to `fast-check` or run an internal property loop and emit a single vitest test.
  - Setup integrates `@effect/vitest` equality helpers.

- Bun adapter (`@effect-native/test-bun`):
  - Integration with Bun’s `test` API, aligning with `@effect-native/bun-test` patterns.
  - Manifest strategy:
    - CLI generates `./.config/effect-native-test/manifest.bun.test.ts` that imports discovered modules and registers tests using `TestRunner` -> Bun `test`.
    - Run with `bun test ./.config/effect-native-test/manifest.bun.test.ts` to avoid duplicate discovery.
    - Optional `bunfig.toml`:
      ```toml
      [test]
      preload = ["@effect-native/test-bun/preload"]
      root = ".config/effect-native-test"
      ```
  - Preload sets up TestServices and equality helpers; MUST NOT hide missing deps (Hard‑Fail).

- Browser adapter (`@effect-native/test-browser`):
  - Harness embeds an existing browser runner (default: Jasmine; optional: Mocha + Chai) and binds `{ describe, it, expect }` to the SPI.
  - Real browser execution (Chromium first) using a harness page and headless automation (Playwright/Puppeteer); `--mode serve` serves a URL for manual browsers.
  - Bundle the manifest for the browser (Vite); establish a WS/bridge to stream events to the host.
  - Import discovered test modules; for each export: call function with `{ describe, it, expect }` or run exported Effect with provided env.
  - Fail loudly if browser‑specific imports/services are missing.
  - MUST reuse `@effect-native/test-core` executor, event protocol, reporters, and transport helpers.

- React Native adapter (`@effect-native/test-react-native`):
  - Hermes‑friendly harness embeds Jasmine by default (or Mocha + Chai with tiny shims) and binds `{ describe, it, expect }` to the SPI.
  - Bundle via Metro, launch simulator/emulator, stream events over WS.
  - Import discovered modules; call function exports with `{ describe, it, expect }` or run exported Effects with provided env.
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
- Native commands Just Work: `pnpm vitest run` and `bun test` execute the suite after init.
- Works with and without local `bunfig.toml` (preload adds equality helpers but is optional).
- Fail‑loud if runtime‑specific imports/services are missing.

Stage B — browser:
- Portable suite runs headless in Chromium; event streams match Node/Bun modulo timing. Serve mode allows manual browsers.
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
- Legacy no‑exports compat shims.

## Success Metrics

- Identical pass/fail semantics across adapters for portable tests.
- CI durations: Node/Bun ≤ ~5 min; Browser ≤ ~7 min; RN ≤ ~10 min (post‑cache).
- Flake rate < 1% for v1 scope.

## Minimal Authoring Example

import { describe, it, expect } from "@effect-native/test"
import * as Effect from "effect/Effect"

describe("add", () => {
  it("adds numbers", () => {
    expect(1 + 2).toBe(3)
  })

  it.effect("works in Effect", () =>
    Effect.gen(function* () {
      const n = 5
      expect(n).toBe(5)
    }))
})

## Initial Tasks

- Scaffold `@effect-native/test` bindings and Effect helpers (no globals).
- Ship thin Node adapters: `@effect-native/test-vitest`, `@effect-native/test-bun`.
- Implement Browser harness (Jasmine default) with headless + serve modes; Vite + Playwright.
- Implement RN harness (Jasmine default) for Hermes; Metro + WS; tiny shims only.
- If Expo Router is used, scaffold a `__DEV__`-only test route and a Maestro flow that deep-links to it.
- Wire manifest/discovery; keep reporters minimal on Browser/RN; use runner‑native reporters on Node/Bun.

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
