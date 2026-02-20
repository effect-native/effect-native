---
title: "v4 beta: tui-testing-library — update effect + @effect/vitest"
status: complete
branch: v4-beta-tui-tl
worktree: /Users/tom/Developer/effect-native/v4-tui-tl
pr_url: "https://github.com/effect-native/effect-native/pull/233"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  - Worktree created from v4-beta-root at /Users/tom/Developer/effect-native/v4-tui-tl
  - peerDependencies.effect updated: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect updated: "latest" → "beta"
  - devDependencies.@effect/vitest updated: "latest" → "beta"
  - No imports from removed packages found in src/
  - PR #233 created targeting v4 branch
artifacts:
  - path: packages-native/tui-testing-library/package.json
    description: tui-testing-library package manifest
---

# v4 beta: @effect-native/tui-testing-library

## Tier: 2 — Medium (effect + @effect/vitest)

## Changes Required

### `packages-native/tui-testing-library/package.json`

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
