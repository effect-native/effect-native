# Effect Refresh Gap Snapshot — 2026-08-14

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
- API reconciliation: beta.107 changed `Schema.toArbitrary` to return a
  FastCheck-dependent factory. All three bun-test property adapters now invoke
  the factory with Effect's FastCheck instance and retain `unknown` internally.
- Removed ServiceMap scan: no matches in active guidance or package code.
- Review: adversarial verdict `APPROVE`; Thing Golf score `-4`.
- Artifact hygiene: temporary PREP and code-review notes are removed after use.
- PR lifecycle: the refreshed `v4-refresh` branch is pushed and represented by
  a ready PR into `v4`.

## Gaps

No active refresh gaps remain.
