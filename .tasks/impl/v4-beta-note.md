---
title: "v4 beta: note — full migration including import path changes"
status: complete
branch: v4-beta-note
worktree: /Users/tom/Developer/effect-native/v4-note
pr_url: "https://github.com/effect-native/effect-native/pull/237"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with build + tests passing:
  - @effect/cli removed from deps (now effect/unstable/cli)
  - @effect/platform removed from deps (now effect/unstable/http etc)
  - @effect/platform-node@beta retained
  - @effect/vitest@beta retained
  - effect dep: "latest" → "beta"
  - All import paths in src/ migrated to effect/unstable/* equivalents
  - pnpm build passes in worktree
  - pnpm test passes in worktree
basis: |
  - Worktree created at /Users/tom/Developer/effect-native/v4-note from origin/v4-beta-root
  - packages-native/note/package.json: removed @effect/cli, @effect/platform; effect→beta, @effect/platform-node→beta, @effect/vitest→beta
  - bin.ts: Args→Argument, Command.run→Command.runWith, FileSystem/Path from effect core, NodeContext→NodeServices
  - Validate.ts: Schema.filter→Schema.check(makeFilter), Schema.transform→Schema.decodeTo+SchemaGetter.transform, Schema<T,E>→Codec<T,E>
  - schemas/src/Slug.ts: collateral fix for same Schema v4 API changes
  - pnpm build passes: all 4 build steps complete
  - pnpm test passes: 37 tests across 3 test files
  - PR #237 created targeting v4 branch
  VERIFIED+FIXED 2026-02-20: Copilot review feedback applied (commit bb7d84ef3 pushed):
  - Validate.ts: restored dynamic error messages with (input: unknown) => `"${String(input)}"...`
    (migration had lost the failing-value context from v3)
  - All 37 tests still pass after fix
artifacts:
  - path: packages-native/note/package.json
    description: note package manifest
  - path: packages-native/note/src
    description: note source files with updated imports
artifacts:
  - path: packages-native/note/package.json
    description: note package manifest
  - path: packages-native/note/src
    description: note source files with updated imports
---

# v4 beta: note

## Tier: 3 — Complex (merged deps + import path migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/cli` → `effect/unstable/cli`
- `@effect/platform` → `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process`

### Update to @beta
- `effect`: dep `latest` → `beta`
- `@effect/platform-node`: dep `latest` → `beta`
- `@effect/vitest`: dev `latest` → `beta`

## Import Migration

Scan all `.ts` files under `packages-native/note/src/` and `packages-native/note/test/` for:

| Old import | New import |
|---|---|
| `from "@effect/cli"` | `from "effect/unstable/cli"` |
| `from "@effect/cli/..."` | map subpath to `effect/unstable/cli` |
| `from "@effect/platform"` | `from "effect/unstable/http"` (or socket/process depending on usage) |
| `from "@effect/platform/..."` | map subpath to appropriate effect/unstable/* |

## Verification

After migrating, run in worktree:
1. `pnpm install`
2. `pnpm build` — must pass
3. `pnpm test` — must pass
