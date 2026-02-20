---
title: "v4 beta: crsql — full migration including import path changes"
status: in_progress
branch: v4-beta-crsql
worktree: /Users/tom/Developer/effect-native/v4-crsql
pr_url: "https://github.com/effect-native/effect-native/pull/235"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with build + tests passing:
  - peerDependencies updated (effect ^4.0.0-beta.0, @effect/sql removed)
  - @effect/sql removed from deps (now effect/unstable/sql)
  - @effect/experimental removed from deps (now effect/unstable/*)
  - @effect/platform removed from deps (now effect/unstable/http etc)
  - @effect/platform-node@beta, @effect/vitest@beta retained
  - @effect/sql-sqlite-{node,bun}@beta retained
  - All import paths in src/ migrated to effect/unstable/* equivalents
  - pnpm build passes in worktree
  - pnpm test passes in worktree
basis: |
  Draft PR #235 created at https://github.com/effect-native/effect-native/pull/235
  Import path migration complete:
  - @effect/sql/* → effect/unstable/sql (SqlClient, SqlError, Statement destructured)
  - @effect/experimental/Reactivity → effect/unstable/reactivity (Reactivity destructured)
  - package.json: removed @effect/sql, @effect/experimental, @effect/platform deps
  - package.json: updated effect/vitest/platform-node/sql-sqlite-* to @beta dist-tags
  Build FAILS (91 TypeScript errors) due to deep effect v4 API breaks:
  - Schema.TaggedError removed → needs alternative
  - Schema.pattern → Schema.isPattern
  - Effect.catchAll removed
  - Effect.ignoreLogged removed
  - Layer.unwrapEffect removed
  - Effect.withConfigProvider removed
  - ConfigProvider.fromJson removed
  - Schema.NonNegativeInt / Schema.annotations API changes
  Follow-up: deep v4 API compatibility pass required
artifacts:
  - path: packages-native/crsql/package.json
    description: crsql package manifest
  - path: packages-native/crsql/src
    description: crsql source files with updated imports
---

# v4 beta: @effect-native/crsql

## Tier: 3 — Complex (merged deps + import path migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/sql` → `effect/unstable/sql`
- `@effect/experimental` → `effect/unstable/persistence`, `effect/unstable/devtools`, `effect/unstable/eventlog`
- `@effect/platform` → `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process`

### Update to @beta
- `effect`: peer `^3.19.0` → `^4.0.0-beta.0`, dev `latest` → `beta`
- `@effect/platform-node`: dev `latest` → `beta`
- `@effect/vitest`: dev `latest` → `beta`
- `@effect/sql-sqlite-bun`: optional `latest` → `beta`
- `@effect/sql-sqlite-node`: optional `latest` → `beta`

## Import Migration

Scan all `.ts` files under `packages-native/crsql/src/` and `packages-native/crsql/test/` for:

| Old import | New import |
|---|---|
| `from "@effect/sql"` | `from "effect/unstable/sql"` |
| `from "@effect/sql/..."` | `from "effect/unstable/sql"` (check subpath) |
| `from "@effect/platform"` | `from "effect/unstable/http"` (or socket/process depending on usage) |
| `from "@effect/platform/..."` | map subpath to appropriate effect/unstable/* |
| `from "@effect/experimental"` | `from "effect/unstable/persistence"` or devtools/eventlog |

## Verification

After migrating, run in worktree:
1. `pnpm install --frozen-lockfile` (expect to fail if lockfile needs updating — use `pnpm install` without flag)
2. `pnpm build` — must pass
3. `pnpm test` — must pass
