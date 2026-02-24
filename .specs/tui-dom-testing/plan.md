# Plan: TUI DOM Testing

This plan outlines the creation of the testing infrastructure.

## Phase 1: Low-Level Library (`@effect-native/tui-testing-library`)

- [ ] **Ghostty Harness**: Setup WASM terminal emulator. (Ref: `packages/tui-testing-library/src/GhosttyHarness.ts`)
- [ ] **PTY Spawn**: Implement `spawnTui` using Bun. (Ref: `packages/tui-testing-library/src/Spawn.ts`)
- [ ] **Assertions**: Implement screen buffer verification. (Ref: `packages/tui-testing-library/src/assertions.ts`)

## Phase 2: High-Level Library (`@effect-native/opentui-dom-testing-library`)

- [ ] **Render Helper**: Port `render` and `screen` from POC. (Ref: `packages/opentui-dom-testing-library/src/render.ts`, `packages/opentui-dom-testing-library/src/screen.ts`)
- [ ] **Event Simulation**: Port `fireEvent`. (Ref: `packages/opentui-dom-testing-library/src/events.ts`)

## Phase 3: Miniapp Validation

- [ ] **Implement Miniapp**: Build `miniapp.tsx` / `miniapp.html`. (Ref: `packages/opentui-dom/poc/miniapp.tsx`, `packages/opentui-dom/poc/miniapp.html`)
- [ ] **Manual Verification**: Run the miniapp and verify interactivity.
- [ ] **Automated Verification**: Write a test using `tui-testing-library` to snapshot the miniapp's output.
