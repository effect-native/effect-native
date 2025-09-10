# @effect-native/test-vitest — Phase 4 Plan

## Milestones (v0)
- [ ] Package scaffold (peer deps: vitest, effect)
- [ ] `src/setup.ts` adds Effect equality; calls `setBindings`
- [ ] `src/runtime.ts` wraps `it` with Effect support (ctx.onTestFinished)
- [ ] Native discovery default; optional manifest script (no default)
- [ ] Smoke tests (`pnpm vitest run`) with sample suite
- [ ] Docs/JSDoc (setupFiles usage, examples)

## Tasks
- Implement setup to register custom equality testers (reuse `@effect/vitest` or minimal bridge) and invoke `setBindings({ describe, it: wrappedIt, expect })`.
- Implement wrappedIt: delegate function tests, wrap Effect tests with runPromise pattern and cancellation via `ctx.onTestFinished`.
- Provide an optional CLI/script to generate `./.config/effect-native-test/manifest.vitest.test.ts` (kept out of default flow).
- Add samples and CI smoke scenario under repo scripts.

## Validation Checkpoints
- `pnpm ok`, `pnpm check`, `pnpm -w build`, `pnpm -w docgen`
- Sample project: `pnpm vitest run` passes with `@effect-native/test` imports and `it.effect`.

## Risks / Mitigations
- Double binding in setup: warn and allow last write wins.
- Vitest API drift: keep adapter surface tiny; re-export minimal types.

## Success Criteria
- After init, `pnpm vitest run` “Just Works” for suites authored against `@effect-native/test`.

