# Evidence Log

- [SUPPORTS] npm registry reported `effect@beta` as `4.0.0-beta.94` on 2026-07-09.
- [SUPPORTS] npm registry reported `@effect/platform-node`, `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` beta tags as `4.0.0-beta.94`.
- [SUPPORTS] `origin/v4` lockfile resolved the Effect beta family at `4.0.0-beta.29`.
- [FALSIFIES] The update was not lockfile-only; `bun run check` failed on removed `effect/ServiceMap`, removed `makeUnsafe`, and changed `SqlError` construction.
- [SUPPORTS] `/Users/tom/Work/refs/effect-smol` contained `migration/services.md`, documenting `Context.Service` as the current service constructor.
- [SUPPORTS] `/Users/tom/Work/refs/effect-smol/packages/effect/src/Schema.ts` documents schema `.makeEffect` for constructor-side validation.
- [SUPPORTS] `bun run check`, `bun run check:tsgo`, `bun --filter @effect-native/crsql test`, `bun run test`, and `bun run docgen` passed after fixes.
- [SUPPORTS] `/Users/tom/Work/refs/effect-smol` was fast-forwarded again to `3f0ccc04711b0a187b973e20fc9c3010c2560da2` during PR review reconciliation.
- [FALSIFIES] Enabling the skipped schema-inference suite showed that `id BLOB PRIMARY KEY` is nullable in SQLite and CR-SQLite rejects it as a replicated-table primary key.
- [SUPPORTS] `id BLOB NOT NULL PRIMARY KEY` passes all nine schema-inference tests, including end-to-end schema recreation and change application.
- [SUPPORTS] focused real-driver tests prove both `CrSqliteExtensionMissing` and `UnhexUnavailable` preserve their underlying `SqlError` causes.
- [FALSIFIES] the original PTY resize test timed out twice under the full suite because it queried the width before the child had observed the resize.
- [SUPPORTS] the synchronized resize probe passed 50 consecutive reruns and the subsequent full `bun run ok` gate.
