---
title: "v4 beta: examples-tui-testing-library — update effect dev dep"
status: complete
branch: v4-beta-examples-tui
worktree: /Users/tom/Developer/effect-native/v4-examples-tui
pr_url: "https://github.com/effect-native/effect-native/pull/225"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - devDependencies.effect: "latest" → "beta"
basis: |
  - Worktree created from origin/v4-beta-root at /Users/tom/Developer/effect-native/v4-examples-tui
  - Changed devDependencies.effect from "latest" to "beta" in package.json
  - No src/ directory exists; no source imports to update
  - PR #225 created targeting v4 branch
artifacts:
  - path: packages-native/examples-tui-testing-library/package.json
    description: examples-tui-testing-library package manifest
---

# v4 beta: @effect-native/examples-tui-testing-library

## Tier: 1 — Simple (effect dev only, private package)

## Changes Required

### `packages-native/examples-tui-testing-library/package.json`

```diff
  "devDependencies": {
-   "effect": "latest"
+   "effect": "beta"
  }
```

Private package — no peer deps, no published artifact.
Check source files for any imports that may need updating.
