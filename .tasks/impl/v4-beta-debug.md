---
title: "v4 beta: debug — full migration including import path changes"
status: in_progress
branch: v4-beta-debug
worktree: /Users/tom/Developer/effect-native/v4-debug
pr_url: "https://github.com/effect-native/effect-native/pull/238"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with build + tests passing:
  - peerDependencies updated (effect ^4.0.0-beta.0, @effect/platform removed)
  - @effect/cli removed from deps (now effect/unstable/cli)
  - @effect/platform removed from deps (now effect/unstable/http etc)
  - @effect/platform-node@beta retained
  - @effect/vitest@beta retained
  - All import paths in src/ migrated to effect/unstable/* equivalents
  - pnpm build passes in worktree
  - pnpm test passes in worktree
basis: |
  - Build passes: `pnpm build` succeeds in worktree
  - Draft PR created: https://github.com/effect-native/effect-native/pull/238
  - Tests blocked: test/CdpConnection.test.ts uses Effect.async (renamed to
    Effect.callback in v4). This is a spec defect requiring spec author to update.
  - PR is DRAFT pending test fix by spec author.
artifacts:
  - path: packages-native/debug/package.json
    description: debug package manifest
  - path: packages-native/debug/src
    description: debug source files with updated imports
---

# v4 beta: @effect-native/debug

## Tier: 3 — Complex (merged deps + import path migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/cli` (dep) → `effect/unstable/cli`
- `@effect/platform` (peer + dev) → `effect/unstable/http`, `effect/unstable/socket`, `effect/unstable/process`

### Update to @beta
- `effect`: peer `^3.19.0` → `^4.0.0-beta.0`, dev `latest` → `beta`
- `@effect/platform-node`: dep `latest` → `beta`
- `@effect/vitest`: dev `latest` → `beta`

## Import Migration

Scan all `.ts` files under `packages-native/debug/src/` and `packages-native/debug/test/` for:

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
