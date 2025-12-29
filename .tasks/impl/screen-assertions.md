---
title: "Impl: Screen Assertions"
status: pending
blocked_by:
  - .tasks/impl/ghostty-harness.md
artifacts:
  - path: packages-native/tui-testing-library/src/assertions.ts
done_when: |
  Can assert on screen text content
  Can snapshot screen state
---

# Impl: Screen Assertions

Helpers to verify the state of the virtual terminal.

## Context
*   **Reference:** `work/.research/opencode/vt-screenshot-testing.md` (SerializeAddon)

## Tasks
1.  Implement `screen.text()` to get plain text.
2.  Implement `screen.ansi()` for snapshots.
3.  Implement `waitFor(predicate)` polling.
