---
title: "v4 beta: repo-gaps — update effect dep"
status: in_progress
branch: v4-beta-repo-gaps
worktree: /Users/tom/Developer/effect-native/v4-repo-gaps
pr_url: "https://github.com/effect-native/effect-native/pull/226"
blocked_by:
  - .tasks/impl/v4-beta-root.md
done_when: |
  PR created targeting v4 with:
  - dependencies.effect: "latest" → "beta"
basis: |
  - PR #226 created targeting v4 branch
  - packages-native/repo-gaps/package.json: effect "latest" → "beta"
  - Source files (src/index.ts, src/ok.ts) have no @effect/* imports; no import changes needed
  - Package added to worktree from v4-beta-root base (package did not exist on that branch)
  VERIFIED 2026-02-20: Copilot review found P1 bugs in ok.ts implementation:
  - analyze() reads SPEC.md from package root but specs are at .ok/rules/*/SPEC.md — hook non-functional
  - runOk scans .gaps/*.md and .qa/*.md but analyze() writes GAPS.md and SPEC.QA.md — paths disconnected
  - yaml package not in package.json dependencies (used in ok.ts)
  - bun package not in package.json dependencies (uses $ from bun)
  - No test coverage for the new package
  These P1 bugs require management review before this PR can be considered complete.
artifacts:
  - path: packages-native/repo-gaps/package.json
    description: repo-gaps package manifest
---

# v4 beta: @effect-native/repo-gaps

## Tier: 1 — Simple (effect runtime dep only)

## Changes Required

### `packages-native/repo-gaps/package.json`

```diff
  "dependencies": {
-   "effect": "latest"
+   "effect": "beta"
  }
```

No peerDependency, no @effect/* packages.
Check source files for any imports that may need updating.
