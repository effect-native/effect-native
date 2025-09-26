# MiniDom Project Memo — 2025-10-09

## Current State
- Documentation gatekeepers for `@effect-native/minidom` are complete: README now includes adapter + events usage, public APIs carry JSDoc that passes `pnpm docgen`, and the new tstyche suite exercises type surfaces.
- Runtime wrappers in `createService` enforce precise node typing with capability guards; `pnpm --filter @effect-native/minidom run build` now succeeds alongside lint/check/test/docgen.
- Added `packages-native/minidom/dtslint/MiniDom.tst.ts` to lock in Effect error channels and Events environment behavior.

## Deferred / Follow-up Tracks
- React reconciler host adapter remains scoped to `.specs/minidom-react-host/` for the `/new-feature` process.
- Capability matrix documentation, onboarding walkthroughs, and the naming audit stay queued for the next milestone.

## Branch & Commits
- Working on `feature/minidom`; latest work staged for commit (docs, type refinements, dtslint coverage) ahead of invoking `/done-feature`.

## Next Actions
1. Commit the documentation + typing updates.
2. Run `.claude/commands/done-feature.md` to transition the spec into the completion workflow.
3. Proceed with any release packaging steps outlined by `/done-feature` once accepted.

## Blockers
- Resolved 2025-09-24: Added placeholder `packages-native/patterns/tsconfig.json` plus `src/index.ts` so Vitest no longer fails during config discovery.
- Resolved 2025-09-24: Async AttributeBag loaders now force asynchronous scheduling (microtask bridge) so `SyncCapability.detect` returns `Option.none`; `packages-native/minidom/test/attribute-bag-streaming.test.ts` and `packages-native/minidom/test/attribute-bag-sync.test.ts` are green under `nix develop --command pnpm ok` (Effect 3.17.14).

## Notes
- Validation braid (`pnpm ok`) is green as of 2025-09-24, confirming the async AttributeBag fix and lint cleanup.
- Keep avoiding broad `try/catch` in Effect pipelines and unsafe type assertions per repository policy.
