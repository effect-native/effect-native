---
title: "QA: Review tui-testing-library test quality"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-tui-testing-lib.md
done_when: |
  Bramwell has reviewed the tests and provided qualitative feedback:
  - Do the tests verify real terminal emulation behavior?
  - Are PTY edge cases covered (resize, signals, encoding)?
  - Would these tests catch platform-specific bugs?
  Evidence: written evaluation with specific examples
---

# QA: Review tui-testing-library Test Quality

Bramwell, please review the test suite for `@effect-native/tui-testing-library` and attempt to invalidate the hypothesis that these tests would catch real bugs in terminal emulation and PTY handling.

## Hypothesis to Invalidate

"The 55 tests in tui-testing-library comprehensively verify Ghostty WASM integration and PTY spawning, and would catch regressions across different terminal scenarios."

## Steps

1. Open the test files in `packages-native/tui-testing-library/test/`
2. Read through the test descriptions
3. For each test, ask:
   - Does this test real terminal behavior or just mock responses?
   - Would this test fail if Ghostty rendered something incorrectly?
   - Are platform-specific PTY quirks (macOS vs Linux) considered?

## Key Test Files to Review

- `GhosttyHarness.test.ts` - WASM terminal emulation
- `Spawn.test.ts` - PTY process spawning
- `assertions.test.ts` - Screen buffer verification

## Questions to Answer

1. **Terminal fidelity**: Do tests verify actual ANSI rendering (colors, cursor, attributes)?
2. **PTY edge cases**: What about terminal resize? SIGWINCH? UTF-8 encoding? Control sequences?
3. **Timing**: Are there race conditions that tests might miss (async PTY output)?
4. **Platform coverage**: Would these tests pass on Linux? Or are they macOS-specific?

## Context

High-Level Goal: Ensure terminal testing infrastructure is reliable
Motivation: If the testing library has bugs, all apps tested with it have false confidence
Obstacle: Terminal emulation is complex; only human review can assess if tests cover the right scenarios

## Response Options

- Reject – "Critical gap: X scenario untested" + explanation
- Pass – "Tests cover the important cases" + brief justification
- Pass with issues – "Acceptable but missing..." + prioritized gaps
