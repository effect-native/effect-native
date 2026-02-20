---
title: "v4 beta: openrouter — update effect + @effect/vitest"
status: complete
branch: v4-beta-openrouter
worktree: /Users/tom/Developer/effect-native/v4-openrouter
pr_url: "https://github.com/effect-native/effect-native/pull/232"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  - Worktree created at /Users/tom/Developer/effect-native/v4-openrouter from origin/v4-beta-root
  - Copied packages-native/openrouter/ from main branch (not present in v4-beta-root)
  - Updated package.json: peerDependencies.effect ^3.19.0→^4.0.0-beta.0, devDependencies.effect latest→beta, @effect/vitest latest→beta
  - No imports from merged packages (@effect/platform, @effect/cli, @effect/sql, @effect/experimental) found in src/
  - PR #232 created targeting v4: https://github.com/effect-native/effect-native/pull/232
  VERIFIED+FIXED 2026-02-20: Effect v4 API renames fixed (commit 46d329d3b pushed):
  - Effect.Service → ServiceMap.Service
  - Schema.TaggedError → Data.TaggedError
artifacts:
  - path: packages-native/openrouter/package.json
    description: openrouter package manifest
---

# v4 beta: @effect-native/openrouter

## Tier: 2 — Medium (effect + @effect/vitest)

## Changes Required

### `packages-native/openrouter/package.json`

```diff
  "peerDependencies": {
-   "effect": "^3.19.0"
+   "effect": "^4.0.0-beta.0"
  },
  "devDependencies": {
-   "effect": "latest",
-   "@effect/vitest": ???
+   "effect": "beta",
+   "@effect/vitest": "beta"
  }
```

Note: On main branch openrouter has no @effect/vitest — check v4 branch state.
No source import changes needed (no merged packages used).
