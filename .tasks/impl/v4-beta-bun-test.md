---
title: "v4 beta: bun-test — update effect peer + dev deps"
status: in_progress
branch: v4-beta-bun-test
worktree: /Users/tom/Developer/effect-native/v4-bun-test
pr_url: "https://github.com/effect-native/effect-native/pull/222"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - peerDependencies.effect: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect: "latest" → "beta"
basis: |
  - Worktree created at /Users/tom/Developer/effect-native/v4-bun-test from origin/v4-beta-root
  - peerDependencies.effect updated: "^3.19.0" → "^4.0.0-beta.0"
  - devDependencies.effect updated: "latest" → "beta"
  - No imports from removed packages found in packages-native/bun-test/src/
  - PR #222 created targeting v4: https://github.com/effect-native/effect-native/pull/222
  VERIFIED 2026-02-20: pnpm ok FAILS — test files use removed v3 APIs:
  - test/equality.test.ts: import * as Either from "effect/Either" (Either → Result in v4)
  - test/index.test.ts: import * as Context from "effect/Context", Context.Tag(...) (→ ServiceMap.Service)
  - test/index.test.ts: import * as fc from "effect/FastCheck" (→ import { FastCheck } from "effect/testing")
  - test/property.test.ts: same FastCheck issue
  - test/index.test.ts: Layer.succeed(TestService, impl) → Layer.succeed(TestService)(impl) (curried)
  These are spec issues requiring spec author to update test files.
artifacts:
  - path: packages-native/bun-test/package.json
    description: bun-test package manifest
---

# v4 beta: @effect-native/bun-test

## Tier: 1 — Simple (effect only, no import path changes)

## Changes Required

### `packages-native/bun-test/package.json`

```diff
  "peerDependencies": {
-   "effect": "^3.19.0"
+   "effect": "^4.0.0-beta.0"
  },
  "devDependencies": {
-   "effect": "latest"
+   "effect": "beta"
  }
```

## No Source Changes

`bun-test` has no imports from removed packages. Only peer/dev version tags need updating.
