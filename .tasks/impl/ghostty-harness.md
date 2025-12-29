---
title: "Impl: Ghostty Harness"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/tui-testing-library/src/ghostty.ts
done_when: |
  Can load Ghostty WASM in Bun test environment
---

# Impl: Ghostty Harness

Set up `ghostty-web` inside `happy-dom` for high-fidelity terminal emulation in tests.

## Context
*   **Reference:** `work/.research/opencode/vt-screenshot-testing.md`
*   **Reference:** `work/.research/opencode/happy-dom-usage.md`

## Tasks
1.  Create `happydom.ts` preload script to mock Canvas/Window for Ghostty.
2.  Implement `GhosttyHarness` class to manage the emulator instance.
