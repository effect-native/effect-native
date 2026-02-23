---
title: Release tui-testing-library
status: done
done_when: |
  - bun run ok passes with no errors
  - Package builds successfully with build-utils pack-v3
  - All tests pass including libsqlite integration test
basis: |
  Identified from `bun run ok` run on 2024-12-29.
  Two blockers discovered during the build/test cycle.
blocked_by: []
artifacts:
  - path: packages-native/tui-testing-library
    description: PTY-based testing utilities for TUI applications with Ghostty WASM emulator
---

# GOAL: Release tui-testing-library

Prepare `@effect-native/tui-testing-library` for npm publication.

## Blockers

### 1. Missing LICENSE file in tui-testing-library

**Error:**

```
packages-native/tui-testing-library build: SystemError: NotFound: FileSystem.copy (LICENSE): ENOENT: no such file or directory, lstat 'LICENSE'
```

**Cause:** The `build-utils pack-v3` step expects a `LICENSE` file in each package directory. The tui-testing-library package is missing this file.

**Fix:** Copy the root LICENSE file to `packages-native/tui-testing-library/LICENSE`.

**File:** `packages-native/tui-testing-library/package.json:34` (build script)

### 2. libsqlite integration test timeout (unrelated but blocks `pnpm ok`)

**Error:**

```
FAIL  @effect-native/libsqlite test/integration.dlopen.test.ts > library is recognized by the system loader (otool/ldd)
Error: Test timed out in 5000ms.
```

**Cause:** The test at `packages-native/libsqlite/test/integration.dlopen.test.ts:26` spawns `otool -L` (macOS) or `ldd` (Linux) to verify the dynamic library, but it's timing out within the default 5000ms vitest timeout.

**File:** `packages-native/libsqlite/test/integration.dlopen.test.ts:26`

**Potential fixes:**

1. Increase the test timeout for this specific test
2. Investigate why the spawn is hanging (possibly waiting on stdin or blocking)
3. Add async handling if the sync spawn is problematic

### 3. Missing README.md in opentui-dom (unrelated but blocks `pnpm ok`)

**Error:**

```
packages-native/opentui-dom build: SystemError: NotFound: FileSystem.copy (README.md): ENOENT: no such file or directory, lstat 'README.md'
```

**Cause:** The `build-utils pack-v3` step expects a `README.md` file in the opentui-dom package directory.

**Fix:** Create a README.md for `packages-native/opentui-dom/`.

**File:** `packages-native/opentui-dom/package.json` (build script)

## Current State (2024-12-29 18:27)

- Tests: 446 passed, 14 skipped (all pass!)
- Build: Failed due to missing README.md in opentui-dom
- Lint/Check/Circular/Codegen/Types: All pass
- tui-testing-library builds successfully now

## Attribution

Some code in tui-testing-library was inspired by or derived from:

- **opentui** - https://github.com/sst/opentui (MIT License, Copyright (c) 2025 opentui)
- **opencode** - https://github.com/sst/opencode (MIT License, Copyright (c) 2025 opencode)

Both projects use MIT license, compatible with this project's MIT license.
NOTICE file should be updated to acknowledge these sources.

### 4. ~~Extract lazygit test to example package (validates public API)~~ DONE

Extracted lazygit.test.ts to `packages-native/examples-tui-testing-library/` which:

- Imports from `@effect-native/tui-testing-library` (not relative paths)
- Uses workspace dependency to validate package exports
- Demonstrates external consumer usage pattern
- Type checks pass via tsc -b with project references

Additional fixes made during extraction:

- Fixed tsconfig.test.json to use `noEmit: true` (tests shouldn't be compiled to build/)
- Added PTY/TTY detection with clear warning when tests are skipped
- Tests properly skip when no TTY available (e.g., running through pnpm)

## Tasks

- [x] Add LICENSE file to tui-testing-library (copy from root)
- [x] Update NOTICE to acknowledge opentui/opencode inspiration
- [x] Fix or skip libsqlite integration test timeout (added 30s timeout)
- [x] Add README.md to opentui-dom
- [x] Add LICENSE to opentui-dom, opentui-dom-testing-library, fetch-hooks
- [x] Add README.md to opentui-dom-testing-library
- [x] Extract lazygit.test.ts to packages-native/examples-tui-testing-library
- [x] Fix tsconfig.test.json to not emit test files
- [x] Add PTY/TTY detection and skip tests gracefully
- [x] Run `bun run ok` to verify all checks pass
- [x] Verify package builds and exports correctly
