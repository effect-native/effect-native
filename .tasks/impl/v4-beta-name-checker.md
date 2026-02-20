---
title: "v4 beta: name-checker — update effect dev dep"
status: complete
branch: v4-beta-name-checker
worktree: /Users/tom/Developer/effect-native/v4-name-checker
pr_url: "https://github.com/effect-native/effect-native/pull/227"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - devDependencies.effect: "latest" → "beta"
basis: |
  Created worktree from v4-beta-root, brought in name-checker package from
  v4-name-checker-private branch (package.json, src/cli.ts, src/index.ts, bin/name-check),
  updated devDependencies.effect from "latest" to "beta". No @effect/* sub-package
  imports found in source. PR #227 created targeting v4 branch.
  VERIFIED+FIXED 2026-02-20: Copilot review feedback applied (commit 791765368 pushed):
  - Fixed shebang: #!/usr/bin/env npx tsx → #!/usr/bin/env -S npx tsx
  - Set process.exitCode = 1 on failure in .catch handler
  - Removed unused imports (Schedule, readline)
  - Bun global reference → (globalThis as any).Bun for type safety
  Deferred to management: tsx version pinning, effect in deps vs devDeps,
  CLI help text name mismatch, check_tlds config not honored.
artifacts:
  - path: packages-native/name-checker/package.json
    description: name-checker package manifest
---

# v4 beta: @effect-native/name-checker

## Tier: 1 — Simple (effect dev only)

## Notes

On `origin/v4`, name-checker is marked `"private": true`.
No peerDependency on effect — only devDependencies.

## Changes Required

### `packages-native/name-checker/package.json`

```diff
  "devDependencies": {
-   "effect": "latest"
+   "effect": "beta"
  }
```

No source import changes needed.
