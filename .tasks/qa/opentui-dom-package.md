---
title: "QA: @effect-native/opentui-dom package"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/GOAL-opentui-dom-package.md
done_when: |
  Bramwell has verified:
  - Package builds without errors
  - All 182 unit tests pass
  - Exports are correctly exposed (DOMAdapter, StyleBridge, ThemeMap, EventRelay, DOMToTUIBridge)
  Evidence: terminal output screenshot or copy-paste
---

# QA: @effect-native/opentui-dom Package

Bramwell, please verify the opentui-dom package builds and tests correctly.

## Steps

1. Open terminal
2. Navigate to `work/effect-native/effect-native`
3. Run: `cd packages-native/opentui-dom`
4. Run: `bun test`
5. Verify all tests pass (should be ~182 tests)
6. Run: `bun run build` (if build script exists) or `bun build src/index.ts`
7. Check that no TypeScript errors occur

## Expected Outcome

- All tests pass (green checkmarks, 0 failures)
- Build completes without errors
- No TypeScript type errors

## Context

High-Level Goal: Validate the DOM-to-TUI bridge package is production-ready
Motivation: This package is the core of the TUI DOM system; if it's broken, nothing else works
Obstacle: Automated tests verify logic but can't confirm the dev experience (build system, exports)

## Response Options

- Reject – reason (e.g., "Tests fail with error X")
- Pass – paste terminal output showing all tests pass
- Pass with issues – evidence + list of warnings or non-blocking issues
