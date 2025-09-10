# @effect-native/test-vitest + @effect-native/test-bun — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Discover `**/*.test.{js,jsx,ts,tsx}`; import each module and for each export:
  - If function: call with `TestRunner` instance from SPI.
  - If Effect: run by providing environment.
- FR1.2: Generate a manifest module for each runner:
  - Vitest: `./.effect-test/manifest.vitest.test.ts`
  - Bun: `./.effect-test/manifest.bun.test.ts`
- FR1.3: Map SPI tests to native APIs with modifiers (`skip`, `only`, `todo`, `failing`, `each`) and property tests.
- FR1.4: Emit SPI events and support dot/verbose/JSON reporters; exit non‑zero on any failure.
- FR1.5: Provide CLIs or scripts to generate manifest and invoke native runners.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Hard‑Fail: if runtime‑specific imports/services are missing, fail loudly (no silent skip).
- NFR2.2: Deterministic time via TestServices/TestClock where applicable; document limitations.
- NFR2.3: Integrate `@effect/vitest` equality testers for vitest; comparable equality for Bun.
- NFR2.4: Work with or without local `bunfig.toml`; CLI may pass `--preload`.

## TC3 — Technical Constraints
- TC3.1: Vitest runs via `vitest run` with ESM config; Bun via `bun test`.
- TC3.2: Avoid duplicate discovery: invoke manifest explicitly.
- TC3.3: Provide preload/setup hooks:
  - Vitest: `setupFiles` or plugin to load a virtual manifest.
  - Bun: `[test].preload = ["@effect-native/test-bun/preload"]` (optional).

## DR4 — Data Requirements
- DR4.1: Reporter JSON adheres to SPI schema; include runner name/version.
- DR4.2: Capture per-test duration and error details (message, stack, cause).

## IR5 — Integration Requirements
- IR5.1: Vitest adapter uses `@effect/vitest` expectation semantics.
- IR5.2: Bun adapter aligns with `@effect-native/bun-test` interfaces.
- IR5.3: Provide small CLI(s) to discover → manifest → run native runner. In this repository, development and CI use Nix; end users must be able to run these CLIs without Nix under standard Node/Bun.

## DEP6 — Dependencies
- DEP6.1: `@effect-native/test` (SPI), `@effect/vitest`, `vitest`, `fast-check`.
- DEP6.2: `bun` (for bun adapter), optional `bunfig.toml`.

## SC7 — Success Criteria
- SC7.1: Same demo suite passes on vitest and Bun with identical outcomes; non‑zero exit on failure.
- SC7.2: Works both with and without local `bunfig.toml` by using CLI flags when absent.
