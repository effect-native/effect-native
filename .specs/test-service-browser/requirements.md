# @effect-native/test-browser — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Execute portable tests in a real browser (Chromium first) via a harness page.
- FR1.2: Bundle manifest for browser (Vite/esbuild/rollup); load and run in page context.
- FR1.3: Establish bidirectional channel (WebSocket or Playwright bridge) to stream SPI events.
- FR1.4: For each discovered module export: call function with `TestRunner` or run exported Effect with provided env.
- FR1.5: Provide dot/verbose/JSON reporters on host; non‑zero exit on failures.
 - FR1.6: MUST use `@effect-native/test-core` executor, event protocol, reporters, and transport helpers.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Hard‑Fail: if browser‑specific imports/services are missing, fail loudly.
- NFR2.2: Headless operation stable on CI; deterministic timing within practical limits.
- NFR2.3: Minimal harness page; no Node shims.

## TC3 — Technical Constraints
- TC3.1: Use Playwright or Puppeteer; Chromium required, Firefox/WebKit optional v1.
- TC3.2: ESM builds; sourcemaps enabled for readable stacks where possible.

## DR4 — Data Requirements
- DR4.1: Reporter JSON matches SPI schema; include browser name/version.
- DR4.2: Capture console logs and unhandled errors from page; forward to host.

## IR5 — Integration Requirements
- IR5.1: CLI to discover → bundle manifest → launch headless browser → stream events.
- IR5.2: Support `--browser chromium|firefox|webkit`; default chromium.
 - IR5.3: Use `@effect-native/test-core` adapter SDK helpers to normalize module exports and build suite tree.

## DEP6 — Dependencies
- DEP6.1: `@effect-native/test` (SPI), `@effect-native/test-core` (executor/reporters/transport), Playwright/Puppeteer, bundler (Vite/esbuild/rollup).

## SC7 — Success Criteria
- SC7.1: Demo suite passes headless in Chromium; outcomes match Node/Bun modulo timing.
- SC7.2: Console/error forwarding visible; fail‑loud on missing browser deps.
