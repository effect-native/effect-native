---
title: Update libcrsql to use Zig-built cr-sqlite
status: triage
done_when: |
  pnpm --filter @effect-native/libcrsql run verify && pnpm --filter @effect-native/libcrsql test
basis: |
  Goal created per user request to migrate from downloaded binaries to local Zig build.
blocked_by: []
artifacts: []
---

# Update libcrsql to Use Zig-Built CR-SQLite

## Summary

Replace the pre-built cr-sqlite binaries in `@effect-native/libcrsql` with binaries built from the Zig implementation at `work/cr-sqlite/cr-sqlite/zig/`.

## Current State

**libcrsql package** (`work/effect-native/effect-native/packages-native/libcrsql/`):
- Downloads pre-built binaries via `scripts/download-binaries.ts`
- Stores binaries in `lib/` for 6 platforms (darwin-aarch64, darwin-x86_64, linux-aarch64, linux-x86_64, win-x86_64, win-i686)
- Verifies checksums via `scripts/verify-binaries.ts`
- Version: references upstream cr-sqlite

**Zig implementation** (`work/cr-sqlite/cr-sqlite/zig/`):
- MVP complete, 154/154 tests passing
- Builds native libraries via `zig build`
- Cross-compilation support for all target platforms
- Output: `zig-out/lib/libcrsqlite.{dylib,so}` or `zig-out/bin/crsqlite.dll`

## Work Items

1. **research/zig-build-matrix.md** - Document build commands for each target platform
2. **spec/zig-binary-parity.md** - Spec: Zig-built binaries pass existing verify tests
3. **impl/build-script.md** - Create build script to replace download script
4. **impl/update-checksums.md** - Update checksums for new binaries
5. **cleanup/remove-download.md** - Remove download infrastructure

## Cross-Repository Coordination

This goal spans two repositories:
- Source: `work/cr-sqlite/cr-sqlite/zig/` (Zig source)
- Target: `work/effect-native/effect-native/packages-native/libcrsql/` (npm package)

Build must be reproducible - same source commit should produce same binaries (or at least API-compatible).

## Success Criteria

- All existing tests pass (`pnpm --filter @effect-native/libcrsql test`)
- Binary verification passes (`pnpm --filter @effect-native/libcrsql run verify`)
- No network dependency at package install time
- Version tracking reflects Zig source commit or tag
