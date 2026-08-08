# Effect Refresh Gap Snapshot — 2026-08-07

## Current evidence

- Branch freshness: prior PR #282 was merged and its remote branch deleted;
  `v4-refresh` was recreated from current `origin/v4` at `df994cc63`.
- npm beta tags: `effect`, `@effect/platform-node`,
  `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` are all
  `4.0.0-beta.105`.
- Current lock resolution: all four packages are `4.0.0-beta.105`.
- Reference checkout: effect-smol is fast-forwarded to `3a1128c7`; the local
  untracked `CLAUDE.md` is preserved.
- Quality gates: `bun install --frozen-lockfile`, `bun run lint-fix`,
  `bun run docgen`, and `bun run ok` all exit `0`.
- Environment repair: the first `bun run ok` found stale package-local
  beta.99 copies of `@effect/platform-node`; removing those two untracked
  dependency directories restored lockfile-consistent beta.105 resolution.
- Removed ServiceMap scan: no matches in active guidance or package code.
- Review: adversarial verdict `APPROVE`; Thing Golf score `-1`.
- Artifact hygiene: temporary PREP and code-review notes are removed after use.
- PR lifecycle: the refreshed `v4-refresh` branch is pushed and represented by
  a ready PR into `v4`.

## Gaps

No active refresh gaps remain.
