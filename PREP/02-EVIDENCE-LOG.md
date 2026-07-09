# Evidence Log

- [SUPPORTS] npm registry reported `effect@beta` as `4.0.0-beta.94` on 2026-07-09.
- [SUPPORTS] npm registry reported `@effect/platform-node`, `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node` beta tags as `4.0.0-beta.94`.
- [SUPPORTS] `origin/v4` lockfile resolved the Effect beta family at `4.0.0-beta.29`.
- [FALSIFIES] The update was not lockfile-only; `bun run check` failed on removed `effect/ServiceMap`, removed `makeUnsafe`, and changed `SqlError` construction.
- [SUPPORTS] `/Users/tom/Work/refs/effect-smol` contained `migration/services.md`, documenting `Context.Service` as the current service constructor.
- [SUPPORTS] `/Users/tom/Work/refs/effect-smol/packages/effect/src/Schema.ts` documents schema `.makeEffect` for constructor-side validation.
- [SUPPORTS] `bun run check`, `bun run check:tsgo`, `bun --filter @effect-native/crsql test`, `bun run test`, and `bun run docgen` passed after fixes.
