---
title: "v4 beta: effect-native CLI — full migration including import path changes"
status: in_progress
branch: v4-beta-effect-native-cli
worktree: /Users/tom/Developer/effect-native/v4-effect-native-cli
pr_url: "https://github.com/effect-native/effect-native/pull/236"
blocked_by:
  - .tasks/impl/v4-beta-root.md
basis: |
  Draft PR #236 created. Build passes.
  VERIFIED+FIXED 2026-02-20: Version string now appears in --help output:
  - Prepended "effect-native ${version}\n\n" to the withDescription string
  - v4 Command.runWith renders description in --help output, making version visible
  - All CLI tests now pass; commit 374a921d6 pushed to v4-beta-effect-native-cli
  The effect-native CLI package itself is fully passing.
done_when: |
  PR created targeting v4 with build + tests passing:
  - @effect/cli removed from deps (now effect/unstable/cli)
  - @effect/platform-node@beta retained
  - effect dep: "latest" → "beta"
  - All import paths in src/ migrated to effect/unstable/* equivalents
  - pnpm build passes in worktree
  - pnpm test passes in worktree
artifacts:
  - path: packages-native/effect-native/package.json
    description: effect-native CLI package manifest
  - path: packages-native/effect-native/src
    description: effect-native CLI source files with updated imports
---

# v4 beta: effect-native (CLI package)

## Tier: 3 — Complex (merged deps + import path migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/cli` → `effect/unstable/cli`

### Update to @beta
- `effect`: dep `latest` → `beta`
- `@effect/platform-node`: dep `latest` → `beta`

## Import Migration

Scan all `.ts` files under `packages-native/effect-native/src/` for:

| Old import | New import |
|---|---|
| `from "@effect/cli"` | `from "effect/unstable/cli"` |
| `from "@effect/cli/..."` | map subpath to `effect/unstable/cli` |

## Verification

After migrating, run in worktree:
1. `pnpm install`
2. `pnpm build` — must pass
3. `pnpm test` — must pass (or note if no tests)
