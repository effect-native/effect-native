# Effect Refresh Gap Snapshot — 2026-07-10

## Current evidence

- Branch freshness: `v4-refresh` is rebased on `origin/v4` at `73087ca4`.
- npm beta tags: `effect`, `@effect/platform-node`,
  `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` are all
  `4.0.0-beta.97`.
- Current lock resolution: all four packages are `4.0.0-beta.97`.
- Reference checkout: effect-smol is fast-forwarded to `5946da38`; the local
  untracked `CLAUDE.md` is preserved.
- Quality gates: `bun install --frozen-lockfile`, `bun run lint-fix`,
  `bun run docgen`, and `bun run ok` all exit `0`.
- PR lifecycle: pending committed refresh.

## Gaps

1. Review, commit, push, and update or create the ready PR into `v4`.
