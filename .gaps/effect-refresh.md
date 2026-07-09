# Gaps Snapshot: .ok/effect-refresh.ok.md

Captured: 2026-07-09 10:44:00 -0400
Branch: v4-refresh
Base: origin/v4 @ 8e7cf3955d6645eacc4be6ed9024bd3cffb361c2

## Observed Reality

- `origin/v4-refresh`: ABSENT before this run.
- `effect` npm `beta`: 4.0.0-beta.94.
- `@effect/platform-node` npm `beta`: 4.0.0-beta.94.
- `@effect/sql-sqlite-bun` npm `beta`: 4.0.0-beta.94.
- `@effect/sql-sqlite-node` npm `beta`: 4.0.0-beta.94.
- `bun.lock` before refresh: Effect beta family at 4.0.0-beta.29 on `origin/v4`.
- `bun.lock` after refresh: Effect beta family at 4.0.0-beta.94.
- `effect-smol` before refresh: b5d068d4cb5ff7336e4d1cac2624d299246ba95a.
- `effect-smol` after refresh: 2711e39af73c5d82f691658f0327e9966f43432f.
- `effect-smol` local untracked files preserved: `CLAUDE.md`.

## Gaps Found

- gap-effect-beta-lock-001: `bun.lock` was behind the current Effect beta family.
- gap-effect-beta-api-001: beta.94 removed `effect/ServiceMap`; repo services still imported it.
- gap-effect-beta-schema-001: beta.94 removed `Schema.Struct.makeUnsafe`; CR-SQLite extension metadata construction still used it.
- gap-effect-beta-sqlerror-001: beta.94 changed `SqlError` construction to require a structured `reason`.
- gap-effect-refresh-tstyche-001: TSTyche 4.3 could not run against the current TypeScript 7 native package shape, and its config file name/sentinel changed in current TSTyche.
- gap-effect-refresh-sqlite-graph-001: host Darwin `zig build` failed to link libSystem from the Nix-profile Zig environment outside `nix develop`.
- gap-effect-refresh-branch-001: `origin/v4-refresh` and a PR into `v4` did not exist before this run.

## Gaps Closed In This Run

- Updated `bun.lock` to Effect beta family 4.0.0-beta.94.
- Migrated service tags from `ServiceMap.Service` to `Context.Service`.
- Replaced CR-SQLite extension metadata `.makeUnsafe` calls with `.makeEffect`.
- Replaced ad hoc `SqlError` message/cause construction with `SqlError.UnknownError` reasons.
- Updated TSTyche to 7.2.1, migrated `tstyche.config.json` to `tstyche.json`, and encoded the classic TypeScript type-test matrix as `>=5.4 <7.0`.
- Kept the native TypeScript line covered through `bun run check:tsgo`.
- Rebuilt tracked sqlite-graph native artifacts with the current Nix/Zig toolchain.
- Made sqlite-graph artifact rebuilds re-enter `nix develop` on Darwin when invoked from the host shell.
- Fast-forwarded `/Users/tom/Work/refs/effect-smol`.

## Evidence

- `bun install --frozen-lockfile`: PASS.
- `bun run check`: PASS.
- `bun run check:tsgo`: PASS.
- `bun --filter @effect-native/crsql test`: PASS after schema constructor fix.
- `bun run test`: PASS.
- `bun run docgen`: PASS.
- `bun run lint-fix`: PASS.
- `bun run test-types`: PASS across TypeScript 5.4.5, 5.5.4, 5.6.3, 5.7.3, 5.8.3, 5.9.3, and 6.0.3.
- `bun test packages/tui-testing-library/test/Spawn.test.ts --test-name-pattern "can resize terminal" --rerun-each 10`: PASS after one full-suite timing failure was isolated.
- `bun --filter @effect-native/sqlite-graph build`: PASS from the host shell via Darwin Nix re-exec.
- `bun run ok`: PASS.
- `v4-refresh` push: PASS.
- PR into `v4`: https://github.com/effect-native/effect-native/pull/281.

## Remaining Work

- None for this snapshot.
