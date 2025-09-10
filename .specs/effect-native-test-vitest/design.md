# @effect-native/test-vitest — Phase 3 Design

## Effect Patterns
- `it.effect` wraps Effect programs with a runPromise pattern. On Vitest, use the TestContext signal to cancel pending fibers when a test finishes (see packages/vitest/src/internal/internal.ts).
- Optional TestEnv provisioning for Effect test services when using extended helpers later.

## Type Safety
- Keep adapter typed narrowly: re-export Vitest’s types for `describe`, `it`, `expect` where practical; otherwise type as unknown-safe facades.
- No unsafe assertions; use precise generics on `it.effect` to carry the error type channel.

## Module Architecture
- src/setup.ts
  - Adds Effect equality testers to Vitest’s expect (similar to customTester in packages/vitest).
  - Calls `setBindings({ describe, it: wrappedIt, expect })` from `@effect-native/test`.
- src/runtime.ts
  - `wrappedIt` implementation:
    - `it(name, fnOrEffect, opts)`
    - If `fnOrEffect` is a function, delegate to Vitest `it(name, fn, opts)`.
    - If it’s an Effect, call `it(name, (ctx) => runPromise(ctx)(effect), opts)` and interrupt fibers on `ctx.onTestFinished`.
- Optional: src/manifest.ts generator for manifest mode (kept minimal; not used by default).

## Error Handling Strategy
- If Vitest is not present, throw clear error advising `pnpm add -D vitest` or choose another runner.
- Fail fast if `setBindings` is called twice (log a warning, last write wins) to prevent confusing multiple setups.

## Testing Strategy
- Unit tests with Vitest in this monorepo to assert:
  - `setBindings` correctly wires describe/it/expect.
  - `it.effect` runs Effects and fails tests on Effect failure.
  - Equality testers enable structural equality with Effect types.

## JSDoc Plan
- `setup.ts` documents how to include it in `vitest.config.ts` `setupFiles`.
- `runtime.ts` documents the behavior of `it.effect`.

## Code Examples
- vitest.config.ts
  ```ts
  import { defineConfig } from 'vitest/config'
  export default defineConfig({ test: { setupFiles: ['@effect-native/test-vitest/setup'] } })
  ```
- Authoring
  ```ts
  import { describe, it, expect } from '@effect-native/test'
  import * as Effect from 'effect/Effect'
  
  describe('demo', () => {
    it('plain', () => expect(1).toBe(1))
    it.effect('eff', () => Effect.gen(function* () { expect(true).toBeTruthy() }))
  })
  ```

## Integration Points
- `@effect-native/test` — consumes `setBindings`.
- `@effect/vitest` — used to integrate equality testers.

