# @effect-native/test-bun — Phase 4 Plan

## Milestones (v0)
- [ ] Package scaffold (peer: effect)
- [ ] `src/preload.ts` adds Effect equality; calls `setBindings`
- [ ] `src/runtime.ts` wraps `it` with Effect support
- [ ] Native discovery default; optional manifest script (no default)
- [ ] Smoke tests (`bun test`) with sample suite
- [ ] Docs/JSDoc (bunfig [test].preload usage, examples)

## Tasks
- Preload registers equality testers and invokes `setBindings({ describe, it: wrappedIt, expect })`.
- Implement wrappedIt: delegate function tests; wrap Effect tests with `Effect.runPromise`.
- Provide an optional CLI/script to generate `./.config/effect-native-test/manifest.bun.test.ts` (kept out of default flow).
- Add samples and CI smoke scenario under repo scripts, guarded for Bun availability.

## Validation Checkpoints
- `pnpm ok`, `pnpm check`, `pnpm -w build`, `pnpm -w docgen`
- Sample project: `bun test` passes with `@effect-native/test` imports and `it.effect`.

## Risks / Mitigations
- Cancellation semantics differ (no TestContext) → document best‑effort behavior; keep v0 simple.
- Bun API drift → keep adapter surface tiny; re-export minimal types.

## Success Criteria
- After init, `bun test` “Just Works” for suites authored against `@effect-native/test`.

