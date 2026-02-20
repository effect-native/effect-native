---
title: "v4 beta: libcrsql — update effect + @effect/platform optional peer"
status: complete
branch: v4-beta-libcrsql
worktree: /Users/tom/Developer/effect-native/v4-libcrsql
pr_url: "https://github.com/effect-native/effect-native/pull/234"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with build + tests passing:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - peerDependencies.@effect/platform removed (merged into effect)
  - Any source imports from @effect/platform migrated to effect/unstable/*
  - pnpm build passes in worktree
  - pnpm test passes in worktree
basis: |
  - PR #234 created targeting v4 branch
  - peerDependencies.effect bumped to "^4.0.0-beta.0"
  - @effect/platform removed from peerDependencies and peerDependenciesMeta
  - No import migration needed: source files import only from "effect" core, not "@effect/platform"
  - pnpm build passes: 6 files compiled, dist/lib copied
  - pnpm test passes: 11 tests pass, 1 skipped (integration load-extension, requires native binary)
artifacts:
  - path: packages-native/libcrsql/package.json
    description: libcrsql package manifest
  - path: packages-native/libcrsql/src
    description: libcrsql source files (check for @effect/platform imports)
---

# v4 beta: @effect-native/libcrsql

## Tier: 3 — Complex (merged optional peer dep + potential import migration)

## Dependency Changes

### Remove (merged into effect core)
- `@effect/platform` (optional peerDependency) — no longer a separate package

### Update
- `effect`: peer `^3.19.0` → `^4.0.0-beta.0`

Note: libcrsql uses conditional/optional peerDependencies — check the
`peerDependenciesMeta` section to understand which deps are optional.

## Import Migration

Scan all `.ts` files under `packages-native/libcrsql/src/` for:

| Old import | New import |
|---|---|
| `from "@effect/platform"` | `from "effect/unstable/http"` (or socket/process) |
| `from "@effect/platform/..."` | map to appropriate effect/unstable/* subpath |

## Verification

After migrating, run in worktree:
1. `pnpm install`
2. `pnpm build` — must pass
3. `pnpm test` — must pass (or note if no tests)
