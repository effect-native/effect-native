# @effect-native/test-browser — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Execute portable tests in a real browser (Chromium first) via a harness page.
- FR1.2: Bundle manifest for browser (Vite/esbuild/rollup); load and run in page context.
- FR1.3: Establish bidirectional channel (WebSocket or Playwright bridge) to stream SPI events.
- FR1.4: For each discovered module export: call function with `TestRunner` or run exported Effect with provided env.
- FR1.5: Provide dot/verbose/JSON reporters on host; non‑zero exit on failures.
 - FR1.6: MUST use `@effect-native/test-core` executor, event protocol, minimal default reporter, and transport helpers.
- FR1.7: Support two operation modes:
  - Headless mode: launch and run tests via an automated browser (Playwright/Puppeteer), then exit with the aggregated result.
  - Serve mode: host a URL that can be opened manually in one or more browsers; each connected client runs the suite and streams results; the host aggregates per‑client outcomes and presents an overall summary.
 - FR1.8: (Deferred) Legacy no‑export tests are out of scope for v0.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Hard‑Fail: if browser‑specific imports/services are missing, fail loudly.
- NFR2.2: Headless operation stable on CI; deterministic timing within practical limits.
- NFR2.3: Minimal harness page; no Node shims.
 - NFR2.4: Serve mode security: include a per‑run random token in the URL; bind address and port configurable; avoid exposing beyond localhost by default.
 - NFR2.5: Assertions: no global `expect`. Provide `expect` via the TestRunner to tests; prefer a proven, existing `expect` implementation (imported library) with Effect equality integration.

## TC3 — Technical Constraints
- TC3.1: Use Playwright or Puppeteer; Chromium required, Firefox/WebKit optional v1.
- TC3.2: ESM builds; sourcemaps enabled for readable stacks where possible.
- TC3.3: WebSocket transport supports multiple concurrent client sessions (serve mode) with session IDs and names (UA-based by default).
 - TC3.4: Keep bundler config minimal in v0; no compat aliasing for legacy test imports.

## DR4 — Data Requirements
- DR4.1: Reporter JSON matches SPI schema; include browser name/version.
- DR4.2: Capture console logs and unhandled errors from page; forward to host.

## IR5 — Integration Requirements
- IR5.1: CLI to discover → bundle manifest → launch headless browser → stream events.
- IR5.2: Support `--browser chromium|firefox|webkit`; default chromium.
- IR5.3: Use `@effect-native/test-core` adapter SDK helpers to normalize module exports and build suite tree.
- IR5.4: Serve mode CLI:
   - `--mode serve` to start an HTTP server that serves the harness page and bundled script.
   - Print URL and QR code; include random token; default bind `127.0.0.1` and random available port.
   - Stream events from each connected client; aggregate per‑client results; display per‑browser summaries and an overall summary.
  - Exit behavior options:
     - `--serve-exit-on-first-complete` (default: false)
     - `--serve-min-clients <n>` (default: 1) and `--serve-timeout <ms>` for waiting window
  - `--serve-stay-open` to keep serving after completion (manual Ctrl+C to exit)
 - IR5.5: (Deferred) Legacy compat shims are out of scope for v0.

## DEP6 — Dependencies
- DEP6.1: `@effect-native/test` (SPI), `@effect-native/test-core` (executor/reporters/transport), Playwright/Puppeteer, bundler (Vite/esbuild/rollup).
 - DEP6.2: Lightweight HTTP static server library (or Node built‑ins) for serve mode; QR code printing utility optional.
 - DEP6.3: Assertion library: prefer an existing proven implementation (e.g., `expect`) and deep equality (`fast-deep-equal` or `lodash.isequal`) if needed.

## SC7 — Success Criteria
- SC7.1: Demo suite passes headless in Chromium; outcomes match Node/Bun modulo timing.
- SC7.2: Console/error forwarding visible; fail‑loud on missing browser deps.
- SC7.3: Serve mode: two distinct manual browsers (e.g., Safari + Firefox) connect to the URL, each runs the suite successfully, host aggregates and displays per‑client summaries and overall result; exit behavior honors CLI flags.
 - SC7.4: A legacy test with no exports that imports `vitest` or `@effect/vitest` runs in the browser harness via shims and passes.
