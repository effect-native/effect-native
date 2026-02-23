# @effect-native/tui-testing-library

PTY-based testing utilities for TUI applications with Ghostty WASM emulator.

## Overview

This library provides testing utilities for terminal user interface (TUI) applications using:

- **Ghostty WASM**: High-fidelity terminal emulation via WebAssembly
- **PTY spawning**: Real process execution with pseudo-terminal support
- **Screen assertions**: Text matching, ANSI color verification, and visual testing

## Usage

Tests in this package use Bun's test runner (`bun:test`), not Vitest.

```typescript
import { GhosttyHarness } from "@effect-native/tui-testing-library/GhosttyHarness"
import { afterEach, beforeAll, describe, expect, test } from "bun:test"

let harness: GhosttyHarness

beforeAll(async () => {
  harness = await GhosttyHarness.createAsync()
})

afterEach(() => {
  harness.cleanup()
})

test("renders menu correctly", async () => {
  const term = harness.createTerminal(40, 10)
  await harness.write(term, "Hello, \x1b[32mWorld\x1b[0m!")
  expect(harness.screenshot(term)).toContain("Hello, World!")
})
```

## Running Tests

```bash
# Run tests with Bun
bun test

# Run with coverage
bun test --coverage
```
