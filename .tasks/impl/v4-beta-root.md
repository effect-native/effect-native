---
title: "v4 beta: update root package.json resolutions and tooling"
status: complete
branch: v4-beta-root
worktree: /Users/tom/Developer/effect-native/v4-root
pr_url: "https://github.com/effect-native/effect-native/pull/221"
blocked_by: []
done_when: |
  PR merged into v4 with:
  - resolutions.effect = "beta"
  - @effect/vitest devDep = "beta"
  - tooling deps unchanged (build-utils, eslint-plugin, language-service, docgen)
basis: |
  PR #221 created targeting v4 branch.
  Changed resolutions.effect from "latest" to "beta" and
  devDependencies.@effect/vitest from "latest" to "beta".
  Tooling deps (@effect/build-utils, @effect/eslint-plugin,
  @effect/language-service, @effect/docgen) left unchanged.
  Branch named v4-beta-root (not v4/beta/root) due to git ref
  hierarchy conflict: remote has refs/heads/v4 which prevents
  any refs/heads/v4/* branch names.
  Commit SHA: 4179ba88257a39e93ebb729b153d64eef4e33ef3
artifacts:
  - path: package.json
    description: Root workspace package.json
---

# v4 beta: Root package.json

## Changes Required

### `package.json`

```diff
- "effect": "latest",
+ "effect": "beta",
```

```diff
- "@effect/vitest": "latest",
+ "@effect/vitest": "beta",
```

Keep at stable (no @beta on npm, follow upstream Effect-TS/effect main):
- `@effect/build-utils` — stay at current version
- `@effect/eslint-plugin` — stay at current version
- `@effect/language-service` — stay at current version
- `@effect/docgen` — stay at current version (upstream uses pkg.pr.new snapshot)

## Notes

This PR must land (or at least be created as the base) before all
per-package PRs, since all packages need `resolutions.effect = "beta"` to
avoid version conflicts between `@effect/*@beta` and `effect@latest`.

All per-package branches are stacked on top of this branch.
