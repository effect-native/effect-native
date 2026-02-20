# Plan: TUI DOM Testing

This plan outlines the creation of the testing infrastructure.

## Phase 1: Low-Level Library (`@effect-native/tui-testing-library`)

- [ ] **Ghostty Harness**: Setup WASM terminal emulator. (Ref: `.tasks/impl/ghostty-harness.md`)
- [ ] **PTY Spawn**: Implement `spawnTui` using Bun. (Ref: `.tasks/impl/pty-spawn.md`)
- [ ] **Assertions**: Implement screen buffer verification. (Ref: `.tasks/impl/screen-assertions.md`)

## Phase 2: High-Level Library (`@effect-native/opentui-dom-testing-library`)

- [ ] **Render Helper**: Port `render` and `screen` from POC. (Ref: `.tasks/impl/render-helper.md`)
- [ ] **Event Simulation**: Port `fireEvent`. (Ref: `.tasks/impl/fire-event.md`)

## Phase 3: Miniapp Validation

- [ ] **Implement Miniapp**: Build `miniapp.tsx` / `miniapp.html`. (Ref: `.tasks/impl/miniapp-implementation.md`)
- [ ] **Manual Verification**: Run the miniapp and verify interactivity.
- [ ] **Automated Verification**: Write a test using `tui-testing-library` to snapshot the miniapp's output.
