---
title: "Package: @effect-native/tui-testing-library"
status: complete
blocked_by:
  - .tasks/impl/ghostty-harness.md
  - .tasks/impl/pty-spawn.md
  - .tasks/impl/screen-assertions.md
artifacts:
  - path: packages-native/tui-testing-library
    description: Low-level PTY testing library
done_when: |
  package builds successfully
  can spawn a simple CLI app in PTY
  can capture and assert on screen output using Ghostty emulator
basis: |
  All impl tasks complete:
  - ghostty-harness.md: 18 tests passing, WASM loads in Bun
  - pty-spawn.md: 16 tests passing
  - screen-assertions.md: 21 tests passing
  Package provides GhosttyHarness, spawnTui, Screen assertions, waitFor
---

# Goal: Create `@effect-native/tui-testing-library`

Create a framework-agnostic testing library for CLI/TUI applications powered by Bun's native PTY and Ghostty WASM.

## Context
*   **Design:** `work/effect-native/effect-native/.specs/tui-dom-testing/design.md`
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/pty-api/findings.md`
*   **Reference:** `work/.research/opencode/vt-screenshot-testing.md` (Ghostty usage)

## Components
1.  **Ghostty Harness:** WASM terminal emulator running in Happy-DOM.
2.  **PTY Spawn:** Wrapper around `Bun.spawn({ terminal: ... })`.
3.  **Assertions:** Helpers to verify screen buffer content.
