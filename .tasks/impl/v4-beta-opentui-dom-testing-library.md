---
title: "v4 beta: opentui-dom-testing-library — update effect + @effect/vitest"
status: complete
branch: v4-beta-opentui-dom-tl
worktree: /Users/tom/Developer/effect-native/v4-opentui-dom-tl
pr_url: "https://github.com/effect-native/effect-native/pull/229"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  Updated devDependencies.effect and devDependencies.@effect/vitest from "latest" to "beta"
  in packages-native/opentui-dom-testing-library/package.json. No source imports from removed
  packages found. PR #229 created targeting v4 branch from worktree at
  /Users/tom/Developer/effect-native/v4-opentui-dom-tl on branch v4-beta-opentui-dom-tl.
  VERIFIED+FIXED 2026-02-20: Copilot/Codex review feedback applied (commit 60360b21d pushed):
  - pnpm-lock.yaml was stale after dep bump — regenerated and pushed
  - Package itself is clean; pnpm test passes for opentui-dom-testing-library scope
artifacts:
  - path: packages-native/opentui-dom-testing-library/package.json
    description: opentui-dom-testing-library package manifest
---

# v4 beta: @effect-native/opentui-dom-testing-library

## Tier: 2 — Medium (effect + @effect/vitest, no peer dep)

## Changes Required

### `packages-native/opentui-dom-testing-library/package.json`

```diff
  "devDependencies": {
-   "effect": "latest",
-   "@effect/vitest": "latest"
+   "effect": "beta",
+   "@effect/vitest": "beta"
  }
```

Private package (no peerDependencies on effect).
No source import changes needed (no merged packages used).
