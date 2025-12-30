---
title: "Impl: PTY Spawn"
status: done
blocked_by: []
artifacts:
  - path: packages-native/tui-testing-library/src/Spawn.ts
done_when: |
  Can spawn a process with PTY
  Can write to stdin
  Can read stdout
---

# Impl: PTY Spawn

Wrapper around `Bun.spawn` with `terminal` options.

## Context
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/pty-api/findings.md`

## Progress Log

### 2024-12-29: Implementation Complete

**Observe:**
- Research findings show Bun.spawn supports PTY via `terminal` option
- Terminal object provides `write()` for stdin, `data` callback for stdout
- Package already existed at `packages-native/tui-testing-library` with GhosttyHarness
- Spawn.ts was already created with the implementation

**Orient:**
- Most critical: ensure tests run properly with Bun PTY APIs
- Tests were using @effect/vitest but PTY is Bun-only
- Need to use bun:test with @effect-native/bun-test helpers

**Decide:**
- Convert tests to use bun:test with BunTest.it.scoped() for Effect tests
- Verify all done_when criteria are met

**Act:**
- Fixed tests to use bun:test instead of @effect/vitest
- Added @effect-native/bun-test as dev dependency
- All 16 tests pass (34 total including GhosttyHarness)

## Done When - Verified

1. **Can spawn a process with PTY** - `spawnTui()` wraps `Bun.spawn` with terminal options
2. **Can write to stdin** - `handle.write()` sends data to PTY stdin via `terminal.write()`
3. **Can read stdout** - `handle.getOutput()` returns accumulated output from `data` callback

## API Summary

```typescript
// Spawn a TUI process
const handle = yield* spawnTui(["my-app"], { cols: 80, rows: 24 })

// Write to stdin
handle.write("hello")
yield* sendLine(handle, "input text")
yield* sendKey(handle, "\x03") // Ctrl+C

// Read stdout
const output = handle.getOutput()
const plainText = getPlainOutput(handle) // ANSI stripped
const raw = handle.getRawOutput() // Uint8Array

// Wait helpers
yield* waitForText(handle, "Welcome")
yield* waitForStable(handle, 100) // wait for output to settle

// Lifecycle
handle.resize(100, 30)
handle.isClosed()
handle.close()
await handle.exited
```

## Tasks
1.  [x] Create package structure (package.json, tsconfig files)
2.  [x] Implement `spawnTui(command)` function
3.  [x] Write unit tests (16 tests passing)
4.  [x] Design for piping output to Ghostty harness (via handle.getOutput())
