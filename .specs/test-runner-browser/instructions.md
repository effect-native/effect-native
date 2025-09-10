# Test Runner (Browser) — Phase 1 Instructions

## Overview

Implement a Browser adapter for the `portable-test-spi` that executes the same portable tests inside a real browser runtime (Chromium/WebKit/Firefox headless). The adapter bundles tests, hosts them in a minimal page, and streams SPI events back to the Node host for reporting.

- Feature name: `test-runner-browser`
- Primary value: Validate browser-specific behavior with zero Node mocks; reuse the same portable suites.

Package Name:
- Browser adapter: `@effect-native/test-browser` (depends on `@effect-native/test`)

## Personas & User Stories

1) Frontend Dev — “Real browser, not a shim”
- I want tests to run in a real browser environment, exercising DOM and Web APIs without Node shims.

2) Library Author — “One suite, multiple runtimes”
- I want the portable SPI suite to run in browser and Node/Bun without code changes.

3) CI Owner — “Deterministic headless runs”
- I want reliable headless runs (Chromium first) and loud failures for missing browsers or misconfigurations.

## Core Requirements

- Browser execution:
  - Bundle the portable test manifest for the browser (Vite/esbuild/rollup acceptable) and load in a minimal harness page.
  - Use a headless automation controller (e.g., Playwright/Puppeteer) to launch the browser and host page.
  - Establish a bidirectional channel (WebSocket or `window.postMessage` + exposed endpoint) to stream SPI events.
  - Discover and import `**/*.test.{js,jsx,ts,tsx}` modules:
    - If an export is a function, call it with a `TestRunner` instance from `@effect-native/test`.
    - If an export is an `Effect`, run it by providing the appropriate environment.

- Reporters and exit behavior:
  - Dot, verbose, and JSON reporters on the Node side; non-zero exit on failures.
  - Forward browser console logs and unhandled errors to the host.

- Capabilities & requirements:
  - No new capability tags; tests express requirements via imports and Effect environment.
  - If a selected test imports browser‑specific modules or requires services not provided, the run fails loudly (Hard‑Fail).

## Technical Specifications

- Harness page:
  - Loads the bundled manifest and a small runtime that provides the `TestRuntime` implementation for browser.
  - Sends SPI events to the host via WebSocket or a Playwright `exposeFunction` bridge.

- CLI flags:
  - `--browser chromium|firefox|webkit` (default `chromium`)
  - `--include/--exclude`, `--reporter dot|verbose|json`, `--timeout <ms>`

- Environment & tooling:
  - All commands run within Nix: `nix develop --command <cmd>`.
  - CI jobs install required browsers; jobs excluded at matrix level if unavailable.

## Acceptance Criteria

- A single portable suite runs headless in Chromium and matches Node/Bun results (modulo timing).
- Browser adapter fails loudly when imports/services are unmet; no silent skips.
- Console/error forwarding visible in host logs.
- Repo quality gates pass: `pnpm ok`, lint, typecheck, docgen, build.

## Out of Scope (v1)

- Cross-browser flake mitigation and retry policies.
- Coverage and snapshots.
- Parallelization/sharding.

## Success Metrics

- Headless Chromium runs complete in CI within ~7 minutes (post-cache) with <1% flake rate for v1 scope.

## Future Considerations

- Watch mode with HMR for the harness page.
- Coverage and snapshot serializers.
- Parallel tabs/contexts and sharding.

## Testing Requirements

- Unit tests (Node side): bundling config, protocol serialization, reporter formatting.
- Integration (e2e): run demo suite in Chromium, compare event streams with Node/Bun runs.
- Validation (inside Nix): `pnpm ok`, `pnpm test` (adapter tests), `pnpm docgen`, `pnpm check`.
