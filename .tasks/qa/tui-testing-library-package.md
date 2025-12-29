---
title: "QA: @effect-native/tui-testing-library package"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-tui-testing-lib.md
done_when: |
  Bramwell has verified:
  - Package builds without errors
  - All 55 unit tests pass
  - Ghostty WASM loads successfully
  - PTY spawn works
  Evidence: terminal output screenshot or copy-paste
---

# QA: @effect-native/tui-testing-library Package

Bramwell, please verify the TUI testing library package builds and tests correctly.

## Steps

1. Open terminal
2. Navigate to `work/effect-native/effect-native`
3. Run: `cd packages-native/tui-testing-library`
4. Run: `bun test`
5. Verify all tests pass (should be ~55 tests)
6. Look for any WASM loading errors or PTY-related failures

## Expected Outcome

- All tests pass (green checkmarks, 0 failures)
- No WASM loading errors
- No PTY spawn failures
- Ghostty harness initializes correctly

## Context

High-Level Goal: Validate the low-level TUI testing infrastructure works
Motivation: This package enables testing TUI apps with real terminal emulation
Obstacle: WASM and PTY are platform-specific; need human verification on macOS

## Response Options

- Reject – reason (e.g., "Ghostty WASM fails to load with error X")
- Pass – paste terminal output showing all tests pass
- Pass with issues – evidence + list of warnings or platform-specific notes
