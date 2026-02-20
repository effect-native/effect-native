---
title: "Impl: Ghostty Harness"
status: done
blocked_by: []
artifacts:
  - path: packages-native/tui-testing-library/src/ghostty.ts
done_when: |
  Can load Ghostty WASM in Bun test environment
---

# Impl: Ghostty Harness

Set up `ghostty-web` inside `happy-dom` for high-fidelity terminal emulation in tests.

## Context

- **Reference:** `work/.research/opencode/vt-screenshot-testing.md`
- **Reference:** `work/.research/opencode/happy-dom-usage.md`

## Tasks

1. [x] Create package structure at `packages-native/tui-testing-library/`
2. [x] Create `happydom.ts` preload script to mock Canvas/Window for Ghostty
3. [x] Implement `GhosttyHarness` class to manage the emulator instance
4. [x] Write tests to verify Ghostty WASM loads in Bun test environment
5. [x] Verify the implementation works

## Basis

The implementation is based on the OpenCode codebase patterns from:

- `refs/opencode/packages/app/happydom.ts` - DOM environment setup with Canvas mock
- `refs/opencode/packages/app/src/addons/serialize.test.ts` - Test patterns for ghostty-web
- `refs/opencode/patches/ghostty-web@0.3.0.patch` - Unicode fix patch (not applied yet)

Key insights:

- `ghostty-web` requires DOM APIs (document, HTMLCanvasElement)
- happy-dom provides these but needs Canvas 2D context mock
- Use `Ghostty.load()` once per test suite, create Terminal instances per test
- Terminal instances need a container element and explicit cleanup
- ghostty-web converts ANSI palette colors to RGB internally

## Implementation Summary

### Files Created/Modified

1. **`src/happydom.ts`** - DOM environment preload
   - Registers happy-dom globals
   - Mocks Canvas 2D context for ghostty-web rendering

2. **`src/GhosttyHarness.ts`** - Main harness class
   - `GhosttyHarness.create()` - Loads WASM module once
   - `createTerminal(cols, rows)` - Creates virtual terminal
   - `write(term, data)` - Async write to terminal
   - `screenshot(term)` - Captures terminal as text grid
   - `getCell(term, row, col)` - Inspects cell attributes/colors
   - `cleanup()` - Disposes terminals and clears DOM

3. **`bunfig.toml`** - Test preload configuration

4. **`test/GhosttyHarness.test.ts`** - 18 passing tests covering:
   - WASM loading
   - Terminal creation
   - Text output and cursor positioning
   - ANSI colors (16-color, 256-color, RGB)
   - Text attributes (bold, italic, underline, faint)
   - Box drawing characters (ASCII and Unicode)
   - Cleanup behavior

### Dependencies Added

- `ghostty-web: ^0.3.0`
- `@happy-dom/global-registrator: ^20.0.11`

## Test Results

```
bun test v1.3.5
 18 pass
 0 fail
 36 expect() calls
Ran 18 tests across 1 file. [99.00ms]
```

## Progress Log

### 2024-12-29: Implementation complete

- Created happydom.ts preload with full Canvas 2D mock
- Created GhosttyHarness class with terminal factory and helpers
- Added comprehensive test suite (18 tests)
- Fixed color tests to match ghostty-web's internal RGB representation
- All tests passing
