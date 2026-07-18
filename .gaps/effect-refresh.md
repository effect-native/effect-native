# Effect Refresh Gap Snapshot — 2026-07-17

## Current evidence

- Branch freshness: `v4-refresh` is rebased on `origin/v4` at `73087ca4`.
- npm beta tags: `effect`, `@effect/platform-node`,
  `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` are all
  `4.0.0-beta.99`.
- Current lock resolution: all four packages are `4.0.0-beta.99`.
- Reference checkout: effect-smol is fast-forwarded to `3a1128c7`; the local
  untracked `CLAUDE.md` is preserved.
- Quality gates: `bun install --frozen-lockfile`, `bun run lint-fix`,
  `bun run docgen`, and `bun run ok` all exit `0`.
- Removed ServiceMap scan: no matches in active guidance or package code.
- PR lifecycle: ready PR #282 remains the expected open refresh PR pending
  push and body refresh.

## Gaps

The code and dependency gates are healthy. Review artifacts, push, and PR body
refresh remain before handoff.
