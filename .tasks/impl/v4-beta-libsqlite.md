---
title: "v4 beta: libsqlite — update effect peer dep range"
status: complete
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
  - Context.GenericTag → ServiceMap.Service migration applied in src/effect.ts (9312b3234)
  - test/error-effect.test.ts: fixed for v4 Cause API — Cause is now {reasons: Reason[]} not a tagged union
  - test/detect.test.ts: fixed platform detection tests — use getLibSqlitePathSync(platform) directly
    for darwin/linux cases; use Object.defineProperty for musl test to avoid process reassign errors
  - All 10 tests pass: commit b52c3088330b0f88880a3ce5a317f535fdc8d225
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
