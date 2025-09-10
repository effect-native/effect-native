# Test Runner (React Native) — Phase 1 Instructions

## Overview

Implement a React Native adapter/runner for the `portable-test-spi` that executes the same portable tests inside a real RN runtime (Hermes/JSC). The host discovers tests, generates a manifest, bundles via Metro, launches a simulator/emulator, and streams SPI events back.

- Feature name: `test-runner-react-native`
- Primary value: Validate RN behavior (native modules, JSI, platform APIs) with zero mocks; reuse portable suites and support RN‑specific tests with capabilities.

Package Name:
- RN adapter: `@effect-native/test-react-native` (depends on `@effect-native/test`)

## Personas & User Stories

1) RN App Developer — “Test the real thing”
- I want to run tests in an actual RN environment and use tools like `@testing-library/react-native` without hoops.

2) Library Author — “One suite, many runtimes”
- I want my portable tests to run under RN and Node/Bun/Browser without code changes.

3) CI Owner — “Fail fast, reproducible runs”
- I want loud failures for missing tools/devices (Xcode/Simulators/Android SDK/Metro) and deterministic behavior.

## Core Requirements

- RN runtime execution:
  - Run tests inside a normal RN app runtime using Metro and Hermes/JSC.
  - No Node shims in RN; portable tests must not assume Node globals.
  - Discover and import `**/*.test.{js,jsx,ts,tsx}` modules:
    - If an export is a function, call it with a `TestRunner` instance from `@effect-native/test`.
    - If an export is an `Effect`, run it by providing the appropriate environment.

- CLI + bundling:
  - Discover files (globs), generate manifest, produce a Metro entry importing the manifest.
  - Launch iOS Simulator (macOS) or Android Emulator (Linux/macOS) and load the bundle.
  - Transport: WebSocket channel between RN app and host to stream SPI events.

- Reporters:
  - Dot, verbose, JSON on the host; non‑zero exit on failures.
  - Forward RN console logs and errors to host.

- Capabilities & RN tools:
  - No new capability tags; tests express RN requirements via imports and Effect environment.
  - RN‑specific tests can import `react-native` and `@testing-library/react-native` directly (no custom wrappers). If these deps are missing when selected, the run fails loudly.

## Technical Specifications

- RN Host App:
  - Minimal RN app component boots an RN `TestRuntime` implementation, loads the generated manifest, and executes tests.
  - Hermes preferred; JSC acceptable per platform defaults.

- CLI flags:
  - `--platform ios|android` (default: `ios` on macOS, `android` on Linux)
  - `--device <name/id>`
  - `--include/--exclude`, `--reporter dot|verbose|json`, `--timeout <ms>`

- Environment & tooling:
  - All commands run within Nix: `nix develop --command <cmd>`.
  - iOS requires Xcode + simulators; Android requires SDK/NDK + emulator images.
  - CI: separate jobs per platform; exclude jobs at the matrix level rather than weakening tests.

## Acceptance Criteria

- A single portable suite runs on iOS Simulator and Android Emulator and matches Node/Bun results (modulo timing).
- A test imports `react-native` (e.g., `Dimensions.get("window")`) and asserts values without mocks.
- An RN‑specific test uses `@testing-library/react-native` directly when run with the RN adapter.
- Clear, loud failures when Metro, devices, or required libs are missing.
- Repo quality gates pass: `pnpm ok`, lint, typecheck, docgen, build.

## Out of Scope (v1)

- Snapshot testing and coverage.
- Watch mode, multi‑device parallelism, physical device orchestration.

## Success Metrics

- RN runs complete on CI within ~10 minutes (post-cache) with <1% flake rate for v1 scope.

## Future Considerations

- Watch mode and incremental bundling.
- Snapshot serializers and coverage integration.
- Parallel multi‑device runs and sharding.
- Flipper plugin for richer UI/logging.

## Testing Requirements

- Unit tests (host side): discovery, manifest generation, protocol serialization, reporter formatting.
- Integration (e2e): “Hello RN” and RN API tests; optional native/JSI if sample available.
- Validation (inside Nix): `pnpm ok`, `pnpm test` (host-side), `pnpm docgen`, `pnpm check`.
