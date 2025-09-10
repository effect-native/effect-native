# Test Runners (vitest + bun:test) — Phase 1 Instructions

## Overview

Provide two adapters that implement the `portable-test-spi`:
1) A vitest adapter that executes the SPI’s registered tests using vitest primitives.
2) A bun:test adapter that executes the same portable tests using Bun’s test runner (leveraging or aligning with `@effect-native/bun-test`).

- Feature name: `test-runners-vitest-bun`
- Primary value: Prove the SPI by running the same tests on Node (vitest) and Bun without code changes.

Package Names:
- Vitest adapter: `@effect-native/test-vitest` (depends on `@effect-native/test`)
- Bun adapter: `@effect-native/test-bun` (depends on `@effect-native/test`)

## Personas & User Stories

1) Library Author — “Adapter bridge to vitest”
- I want a thin vitest adapter that consumes the SPI so my existing Node CI runs portable tests unchanged.

2) Bun User — “Parity with vitest”
- I want a bun:test adapter so I can run the same portable suites under Bun with consistent semantics.

3) CI Owner — “Fail fast, deterministic Node/Bun runs”
- I want clear commands that fail loudly if the environment is misconfigured, aligned with the repo’s Hard‑Fail policy.

## Core Requirements

- Vitest adapter:
  - Load the SPI manifest, register tests into vitest via `test/it/describe` (or `@effect/vitest`), and preserve semantics: timeouts, modifiers, property tests.
  - Forward events to the SPI reporter(s) and/or piggyback on vitest reporters where appropriate.
  - Exit non‑zero on failures; produce optional JSON summary.

- Bun adapter:
  - Load the SPI manifest and map cases into Bun’s `test` API (building on `@effect-native/bun-test` patterns).
  - Preserve semantics: timeouts, modifiers, property tests; integrate TestServices for deterministic time where applicable.
  - Exit non‑zero on failures; optional JSON summary.

- Test discovery & invocation:
  - Discover `**/*.test.{js,jsx,ts,tsx}`. For each matched module:
    - If an export is a function, call it with a `TestRunner` instance from `@effect-native/test`.
    - If an export is an `Effect`, run it by providing the appropriate environment.
  - Support `@effect/vitest`-style helpers available on the provided `TestRunner` (e.g., `it.effect`).

- Shared semantics:
  - Same event protocol and test modifiers as defined by `portable-test-spi`.
  - Deterministic time via TestClock where applicable.

## Technical Specifications

- Vitest adapter details:
  - Prefer integration with `@effect/vitest` for Effect‑native tests.
  - For each SPI test case, register a vitest test dynamically; apply modifiers (`skip`, `only`, `todo`, `failing`, `each`).
  - For property tests, map SPI arbitraries to `fast-check` used by vitest or run property loop internally then emit a single vitest test.
  - Reporter interop: either translate vitest events to SPI events or emit SPI events from the adapter execution layer.

- Bun adapter details:
  - Align with `@effect-native/bun-test` interfaces where sensible (Testers, property testing via `fast-check`).
  - Map SPI registration to Bun `test` with modifiers and optional property wrapper.
  - Reporter interop: emit SPI events; optionally mirror to Bun reporter output.

- Environment & tooling:
  - All commands run within Nix: `nix develop --command <cmd>`.
  - CI: separate jobs for Node (vitest) and Bun. Exclude unsupported jobs at the matrix level rather than weakening tests.

## Acceptance Criteria

- A single demo suite (from `portable-test-spi`) runs:
  - Under vitest on Node, producing passing events and correct exit code.
  - Under Bun (`bun test`), producing matching events and correct exit code.

- Environment verification:
  - For vitest and Bun, tests that import runtime‑specific services or modules not present MUST fail loudly (Hard‑Fail). Portable tests must not assume RN or browser globals.

- Reporting & DX:
  - Dot and Verbose reporters implemented; optional JSON artifact.
  - Clear, loud errors when environment/tooling are missing (e.g., Bun not installed when bun job selected).

- Repo quality gates:
  - `nix develop --command pnpm ok` remains green (outside intentional RED in TDD).
  - Lint, typecheck, docgen, and build pass.

## Out of Scope (v1)

- Snapshot testing and coverage.
- Watch mode and parallel orchestration.

## Success Metrics

- Identical test suite runs on vitest and Bun without changes.
- Node/Bun runs complete on CI within ~5 minutes (post‑cache) and are stable (<1% flakes) for v1 scope.
- Minimal adapter surfaces; low maintenance burden.

## Future Considerations

- Snapshot serializers and coverage integration.
- Parallel runs and sharding.

## Testing Requirements

- Unit tests (Node side):
  - Vitest adapter: mapping from SPI registration to vitest tests; modifiers; property tests; reporter bridging.
  - Bun adapter: mapping from SPI registration to Bun tests; modifiers; property tests; reporter bridging.

- Integration tests (end‑to‑end):
  - Run the demo suite via vitest and via Bun and compare event streams (allow timing variance).

- Validation (inside Nix):
  - `nix develop --command pnpm -w install`
  - `nix develop --command pnpm ok`
  - `nix develop --command pnpm test` (for adapter unit/integration tests where applicable)

## Guardrails & Policies Alignment

- Hard‑Fail Policy: Never hide missing runtimes behind guards; fail loudly with explicit remediation.
- Evidence‑First: Document reproduction commands and environment checks in docs for both adapters.
- Type Assertions Policy: Avoid unsafe assertions; `as const` allowed.
- Modern Effect Patterns: Permit `yield* new Error()` style; forbid `try/catch` in `Effect.gen`.
- Nix Dev Env: Always run inside `nix develop` to avoid ABI/version mismatches.
