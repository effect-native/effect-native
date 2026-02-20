---
title: "v4 beta: opentui-dom — update effect + @effect/vitest"
status: complete
branch: v4-beta-opentui-dom
worktree: /Users/tom/Developer/effect-native/v4-opentui-dom
pr_url: "https://github.com/effect-native/effect-native/pull/228"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  - Worktree created from origin/v4-beta-root at /Users/tom/Developer/effect-native/v4-opentui-dom
  - Updated packages-native/opentui-dom/package.json: peerDependencies.effect ^3.19.0→^4.0.0-beta.0, devDependencies.effect latest→beta, devDependencies.@effect/vitest latest→beta
  - Scanned src/ for @effect/cli, @effect/platform, @effect/sql, @effect/experimental imports — none found
  - PR #228 created targeting v4: https://github.com/effect-native/effect-native/pull/228
artifacts:
  - path: packages-native/opentui-dom/package.json
    description: opentui-dom package manifest
---

# v4 beta: @effect-native/opentui-dom

## Tier: 2 — Medium (effect + @effect/vitest)

## Changes Required

### `packages-native/opentui-dom/package.json`

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
