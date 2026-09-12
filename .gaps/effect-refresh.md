# Effect Refresh Gap Snapshot — 2026-09-11

## Current evidence

- Branch freshness: `v4-refresh` is rebased on current `origin/v4` at
  `df994cc63`; PR #283 remains open and ready.
- npm beta tags: `effect`, `@effect/platform-node`,
  `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` are all
  `4.0.0-beta.107`.
- Current lock resolution: all four packages are `4.0.0-beta.107`.
- Reference checkout: effect-smol is fast-forwarded to `3a1128c7`; the local
  untracked `CLAUDE.md` is preserved.
- Quality gates: `bun install --frozen-lockfile`, `bun run lint-fix`,
  `bun run docgen`, and `bun run ok` all exit `0`.
- Lock reconciliation: a pre-existing September 8 lock delta captured current
  wildcard type-tooling releases. Eligible consumers now resolve `@types/bun`
  and `bun-types` at `1.4.2`, `@types/node` at `26.5.0`, and `undici-types` at
  `8.9.0`; frozen install and the full gate pass.
- Removed ServiceMap scan: no matches in active guidance or package code.
- Review: adversarial verdict `APPROVE`; Thing Golf score `-2`.
- Artifact hygiene: temporary PREP and code-review notes are removed after use.
- PR lifecycle: the refreshed `v4-refresh` branch is pushed and represented by
  a ready PR into `v4`.

## Gaps

No active refresh gaps remain.
