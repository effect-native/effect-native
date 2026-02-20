---
title: "v4 beta: patterns — update effect + @effect/vitest"
status: in_progress
branch: v4-beta-patterns
worktree: /Users/tom/Developer/effect-native/v4-patterns
pr_url: "https://github.com/effect-native/effect-native/pull/230"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
  - devDependencies.@effect/vitest: "latest" → "beta"
basis: |
  - Worktree created from v4-beta-root at /Users/tom/Developer/effect-native/v4-patterns
  - peerDependencies.effect updated: ^3.19.0 → ^4.0.0-beta.0
  - devDependencies.effect updated: latest → beta
  - devDependencies.@effect/vitest updated: latest → beta
  - No source imports from removed packages found in packages-native/patterns/src/
  - PR #230 created targeting v4 branch
  VERIFIED 2026-02-20: pnpm ok FAILS — impl fixes committed (a40701170):
  - src/internal/list.ts, tree.ts, thing.ts: Hash.cached(self, hash) → hash (v4 auto-caches)
  - src/CodexSession.ts: Schema.Union(a,b,c) → Schema.Union([a,b,c]) (3 call sites)
  - src/CodexSession.ts: Schema.Literal("a","b") → Schema.Literals(["a","b"])
  Remaining spec issues (management decision needed):
  - test/Thing.test.ts, test/Tree.test.ts: Data.struct({...}) removed in v4
  - test/CodexSession.test.ts: Schema.decodeUnknown removed in v4
artifacts:
  - path: packages-native/patterns/package.json
    description: patterns package manifest
---

# v4 beta: @effect-native/patterns

## Tier: 2 — Medium (effect + @effect/vitest)

## Changes Required

### `packages-native/patterns/package.json`

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
