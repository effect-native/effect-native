# @effect-native/test — Phase 4 Plan

## Milestones (v0)
- [ ] Package scaffold (ESM, tsconfig, package.json, build)
- [ ] Registry + bindings (`setBindings` / `getBindings`)
- [ ] `it.effect` minimal helper (wrap `Effect.runPromise`)
- [ ] Index exports (`describe`, `it`, `expect` accessors; types)
- [ ] `templates/test-env.d.ts` (ambient types only)
- [ ] Unit tests (registry + `it.effect` failure propagation)
- [ ] Docs/JSDoc (authoring example, adapter contract)

## Tasks
- Scaffold package structure aligned with repo conventions (no globals; ESM; strict TS).
- Implement `src/internal/registry.ts` with fail‑fast error when missing bindings.
- Implement `src/it.ts` with `it.effect(name, effect)` delegating to active `it`.
- Implement `src/index.ts` to surface accessors over the registry and export `setBindings` for adapters.
- Add `templates/test-env.d.ts` and document its use in `--init`.
- Add minimal unit tests with Vitest to validate registry and `it.effect`.

## Validation Checkpoints
- `pnpm ok`, `pnpm check`, `pnpm -w build`, `pnpm -w docgen`
- `pnpm vitest run` for local unit tests

## Risks / Mitigations
- Missing bindings at runtime → explicit, actionable error message.
- Divergent semantics across adapters → keep helper minimal; push execution semantics to adapters.

## Success Criteria
- Authoring snippet compiles and runs under Vitest/Bun adapters (see adapter plans).
- `it.effect` surfaces Effect failures as test failures.

