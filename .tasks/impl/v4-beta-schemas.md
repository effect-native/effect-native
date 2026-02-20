---
title: "v4 beta: schemas — update effect + @effect/vitest"
status: complete
branch: v4-beta-schemas
worktree: /Users/tom/Developer/effect-native/v4-schemas
pr_url: "https://github.com/effect-native/effect-native/pull/231"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  - Worktree created at /Users/tom/Developer/effect-native/v4-schemas from origin/v4-beta-root
  - peerDependencies.effect updated ^3.19.0 → ^4.0.0-beta.0
  - devDependencies.effect updated latest → beta
  - devDependencies.@effect/vitest updated latest → beta
  - No source imports from removed packages found in packages-native/schemas/src/
  - PR #231 created targeting v4 branch
artifacts:
  - path: packages-native/schemas/package.json
    description: schemas package manifest
---

# v4 beta: @effect-native/schemas

## Tier: 2 — Medium (effect + @effect/vitest)

## Changes Required

### `packages-native/schemas/package.json`

```diff
  "peerDependencies": {
-   "effect": "^3.19.0"
+   "effect": "^4.0.0-beta.0"
  },
  "devDependencies": {
-   "effect": "latest",
-   "@effect/vitest": "latest"
+   "effect": "beta",
+   "@effect/vitest": "beta"
  }
```

No source import changes needed (no merged packages used).
