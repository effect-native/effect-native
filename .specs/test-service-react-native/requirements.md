# @effect-native/test-react-native — Phase 2 Requirements

## FR1 — Functional Requirements
- FR1.1: Execute portable tests in a real RN runtime (Hermes preferred, JSC acceptable) via Metro bundle.
- FR1.2: Discover test modules; for each export: call function with `TestRunner` or run exported Effect with provided env.
- FR1.3: Provide CLI to discover → generate manifest → start Metro → launch simulator/emulator → stream SPI events.
- FR1.4: Provide dot/verbose/JSON reporters on host; non‑zero exit on failures.
- FR1.5: Allow RN‑specific tests to import `react-native` and `@testing-library/react-native` directly.
 - FR1.6: MUST use `@effect-native/test-core` executor, event protocol, reporters, and transport helpers.

## NFR2 — Non‑Functional Requirements
- NFR2.1: Hard‑Fail: loud errors when Metro, simulators/emulators, or RN deps are missing; no silent skips.
- NFR2.2: Deterministic where feasible; document timing caveats.
- NFR2.3: No Node shims in RN; portable tests avoid Node globals.

## TC3 — Technical Constraints
- TC3.1: iOS requires Xcode + simulators; Android requires SDK/NDK + emulator images.
 - TC3.2: In this repository, development and CI use the Nix dev shell for install/build/test; end users of the published adapter are not required to use Nix and can run under standard Node with the RN toolchain installed.
- TC3.3: WebSocket transport between RN app and host process.

## DR4 — Data Requirements
- DR4.1: Reporter JSON matches SPI schema; include platform/device name and RN runtime (Hermes/JSC).
- DR4.2: Forward RN console logs and unhandled errors to host.

## IR5 — Integration Requirements
- IR5.1: RN Host App boots RN `TestRuntime`, loads generated manifest module, executes tests.
- IR5.2: CLI flags: `--platform ios|android`, `--device <name/id>`, `--include/--exclude`, `--reporter`, `--timeout`.
- IR5.3: Integrate with Metro and simulator/emulator tooling. In‑repo development/CI use Nix; end users run without Nix provided platform toolchains are installed.
- IR5.4: Use `@effect-native/test-core` adapter SDK helpers to normalize module exports and build suite tree.

## DEP6 — Dependencies
- DEP6.1: `@effect-native/test` (SPI), `@effect-native/test-core` (executor/reporters/transport), `react-native`, `@testing-library/react-native` (for RN‑specific tests), Metro, WebSocket.
- DEP6.2: Xcode (iOS), Android SDK/NDK + Emulator (Android).

## SC7 — Success Criteria
- SC7.1: Demo suite passes on iOS Simulator and Android Emulator; outcomes match Node/Bun modulo timing.
- SC7.2: RN API test (e.g., `Dimensions.get("window")`) passes without mocks.
- SC7.3: RN test using `@testing-library/react-native` runs without custom wrappers.
