---
title: "Impl: PTY Spawn"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/tui-testing-library/src/spawn.ts
done_when: |
  Can spawn a process with PTY
  Can write to stdin
  Can read stdout
---

# Impl: PTY Spawn

Wrapper around `Bun.spawn` with `terminal` options.

## Context
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/pty-api/findings.md`

## Tasks
1.  Implement `spawnTui(command)` function.
2.  Ensure it pipes output to the Ghostty harness.
