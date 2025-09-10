# @effect-native/test-service — Phase 2 Requirements (Cross-Cutting)

## FR1 — Functional Requirements
- FR1.1: Provide a portable SPI/DSL to write Effect tests once and run on multiple runtimes without code changes.
- FR1.2: Support two exported test shapes: function(TestRunner) and Effect program (no params).
- FR1.3: Standardize event protocol: run/suite/test start/end, log, summary with timing and status.
- FR1.4: Provide dot, verbose, and JSON reporters with non‑zero exit on any failure.
- FR1.5: Adapters integrate with native runners (vitest, bun:test, browser, RN) rather than replacing them.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Fail‑fast policy: never hide missing deps/runtimes behind guards; fail loudly with remediation.
- NFR2.2: Deterministic by default where feasible (Effect TestClock guidance); document platform caveats.
- NFR2.3: Type safety: no `as any`, no unsafe double assertions; prefer inference; allow `as const`.
- NFR2.4: Modern Effect patterns (v3.17+): allow `yield* new Error()`; forbid `try/catch` in generators.
 - NFR2.5: Nix dev shell is required for developing and CI in this repository to avoid ABI/version drift; end users of published packages/adapters MUST NOT need Nix to run tests with vitest, bun:test, browser, or RN.

## TC3 — Technical Constraints
- TC3.1: ESM‑first packages with generated `.d.ts`; TS strict mode.
- TC3.2: Node ≥ 18.x for Node/vitest and host tools; Bun ≥ latest stable for bun:test.
- TC3.3: CI jobs must run within Nix; platform jobs excluded at matrix level if unavailable.
- TC3.4: No Node/RN/DOM globals in portable SPI; platform specifics only via adapters/services.

## DR4 — Data Requirements
- DR4.1: Define TypeScript types for `TestCase`, `TestSuite`, `TestEvent`, `TestRuntime`, `TestReporter`.
- DR4.2: JSON reporter output schema includes suite tree, test statuses, durations, and error objects (message, stack, cause).
- DR4.3: Manifest metadata (if used) is derived; no custom capability tags stored.

## IR5 — Integration Requirements
- IR5.1: Vitest and Bun adapters must map SPI tests to native `describe/it`/`test` with modifiers and property tests.
- IR5.2: Browser adapter executes in real headless browser via harness page + WS/bridge.
- IR5.3: RN adapter executes in real RN runtime via Metro + simulator/emulator + WS transport.
- IR5.4: Reporters compatible across adapters; identical event semantics modulo timing.

## DEP6 — Dependencies
- DEP6.1: `effect@^3.17.11` (SPI and all adapters).
- DEP6.2: `@effect/vitest` (vitest integration), `fast-check` (property testing).
- DEP6.3: Playwright/Puppeteer (browser), React Native toolchain (RN), Metro (RN), WebSocket.
 - DEP6.4: Nix (dev/CI only), pnpm (workspace).

## SC7 — Success Criteria
- SC7.1: Stage A parity: same portable suite passes under vitest and Bun with identical outcomes.
- SC7.2: Stage B parity: same suite passes headless in Chromium with matching outcomes (timing allowed to vary).
- SC7.3: Stage C parity: same suite passes on iOS Simulator and Android Emulator without RN mocks.
- SC7.4: CI durations: Node/Bun ≤ ~5m, Browser ≤ ~7m, RN ≤ ~10m (post‑cache); flake rate < 1%.
