---
title: "v4 beta: ssh-keep — update effect dep"
status: complete
branch: v4-beta-ssh-keep
worktree: /Users/tom/Developer/effect-native/v4-ssh-keep
pr_url: "https://github.com/effect-native/effect-native/pull/224"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - dependencies.effect: "latest" → "beta"
basis: |
  - PR #224 created targeting v4 branch
  - Added dependencies.effect: "beta" to packages-native/ssh-keep/package.json
  - Source files (src/cli.ts, src/index.ts) have no @effect/* imports; no source changes needed
  - Worktree at /Users/tom/Developer/effect-native/v4-ssh-keep on branch v4-beta-ssh-keep
artifacts:
  - path: packages-native/ssh-keep/package.json
    description: ssh-keep package manifest
---

# v4 beta: ssh-keep

## Tier: 1 — Simple (effect runtime dep only)

## Changes Required

### `packages-native/ssh-keep/package.json`

```diff
  "dependencies": {
-   "effect": "latest"
+   "effect": "beta"
  }
```

No peerDependency, no @effect/* packages.
Check source files for any imports that may need updating.
