---
title: "v4 beta: libsqlite — update effect peer dep range"
status: in_progress
branch: v4-beta-libsqlite
worktree: /Users/tom/Developer/effect-native/v4-libsqlite
pr_url: "https://github.com/effect-native/effect-native/pull/223"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
basis: |
  - Worktree created from origin/v4-beta-root at /Users/tom/Developer/effect-native/v4-libsqlite
  - peerDependencies.effect updated: "^3.19.0" → "^4.0.0-beta.0" in packages-native/libsqlite/package.json
  - No imports from @effect/cli, @effect/platform, @effect/sql, @effect/experimental found in src/
  - PR #223 created targeting v4: https://github.com/effect-native/effect-native/pull/223
  VERIFIED 2026-02-20: pnpm ok FAILS — impl fix committed+pushed (9312b3234):
  - Context.GenericTag → ServiceMap.Service migration applied in src/effect.ts
  Remaining spec issues (management decision needed):
  - test/error-effect.test.ts: exit.cause._tag === "Fail" — v4 Cause structure changed
  - test/detect.test.ts: platform detection tests fail on NixOS/Linux
artifacts:
  - path: packages-native/libsqlite/package.json
    description: libsqlite package manifest
---

# v4 beta: @effect-native/libsqlite

## Tier: 1 — Simple (optional effect peer only)

## Changes Required

### `packages-native/libsqlite/package.json`

```diff
  "peerDependencies": {
-   "effect": "^3.19.0"
+   "effect": "^4.0.0-beta.0"
  }
```

`effect` is optional in peerDependencies — update range only.
No devDependency on effect in this package.
No source import changes needed.
