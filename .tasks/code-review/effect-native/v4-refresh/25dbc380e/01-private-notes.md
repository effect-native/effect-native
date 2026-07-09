## Code Review Log - v4-refresh

### 1. Incentive (Hypothesis)

- Claim: This change keeps `v4` current with the Effect beta line while preserving the repo's hard-fail gates.
- Evidence: `bun.lock` resolves Effect beta packages to `4.0.0-beta.94`; `.ok/effect-refresh.ok.md` defines the recurring target state; `bun run ok` passed after the refresh.

### 2. Adversarial Attack (Falsification)

- [resolved-risk] Effect API drift could have been papered over with assertions or fallbacks.
  - Evidence: `packages/crsql/src/CrSql.ts:440` and `packages/crsql/src/CrSqliteExtension.ts:55` use structured `SqlError` / schema effects instead of unsafe assertions.
- [resolved-risk] TSTyche could silently stop covering useful compiler versions after TypeScript 7 changed package shape.
  - Evidence: `tstyche.json:3` encodes the classic compiler matrix as `>=5.4 <7.0`, and `scripts/ok.mjs` delegates to that config while `bun run check:tsgo` remains in the `ok` gate.
- [resolved-risk] Darwin sqlite-graph rebuilds could remain host-shell fragile.
  - Evidence: `packages/sqlite-graph-ext/scripts/rebuild-all.mjs:3` re-execs under `nix develop` on Darwin, and `:18` prints a hard-fail diagnostic if the re-exec itself fails.
- [observed-risk] Native binary artifacts were regenerated and shrank substantially.
  - Evidence: `git diff --stat` shows all six `packages/sqlite-graph-ext/lib/*` artifacts changed. Mitigation: `bun --filter @effect-native/sqlite-graph build` and full `bun run ok` both passed after regeneration.

### 3. Simplicity (Stability)

- Service API migration is mechanical: `ServiceMap.Service` to `Context.Service`.
- CR-SQLite schema changes are localized to metadata construction and preserve explicit failure channels.
- TSTyche ownership is simplified by moving the target range into `tstyche.json` instead of duplicating it in `scripts/ok.mjs`.
- The sqlite-graph Nix path is centralized in one package rebuild script rather than weakening tests or build gates.

### 4. Reversibility (Safety)

- Dependency refresh is lockfile/package metadata plus compatibility edits; revert is contained to the refresh commit.
- The native artifact rebuild can be repeated with `bun --filter @effect-native/sqlite-graph build`.
- PR merge is optional and isolated on `v4-refresh`; `v4` is unaffected until explicitly merged.
