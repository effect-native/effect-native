# @effect-native/test-bun — Phase 3 Design

## Effect Patterns
- `it.effect` wraps Effect programs with `Effect.runPromise` and propagates failures to Bun’s runner.
- No TestContext in Bun; cancellation is best-effort in v0 (interruptible tests not guaranteed) — keep simple and reliable.

## Type Safety
- Use Bun’s `test`/`describe`/`expect` types where exposed; provide minimal facades otherwise.
- Avoid unsafe assertions.

## Module Architecture
- src/preload.ts
  - Adds Effect equality to Bun’s expect (mirrors Vitest’s custom tester using `effect/Equal`).
  - Calls `setBindings({ describe, it: wrappedIt, expect })` from `@effect-native/test`.
- src/runtime.ts
  - `wrappedIt(name, fnOrEffect, opts)`
    - Function form delegates to Bun’s `test`.
    - Effect form runs `Effect.runPromise(effect)`.
- Optional: src/manifest.ts generator for manifest mode (not used by default).

## Error Handling Strategy
- If Bun is not present, fail fast with remediation suggesting `bun` installation or another runner.
- If preload is not wired, tests still work (native `bun test`), but equality helpers won’t be active.

## Testing Strategy
- Bun tests (where available locally) to verify:
  - `setBindings` wiring.
  - `it.effect` failure propagation.
  - Equality tester behavior with Effect types.
- Fallback: run adapter code under Node with stubs for types in unit tests when Bun is unavailable.

## JSDoc Plan
- `preload.ts` documents `bunfig.toml [test].preload = ["@effect-native/test-bun/preload"]`.
- `runtime.ts` documents `it.effect` behavior.

## Code Examples
- bunfig.toml
  ```toml
  [test]
  preload = ["@effect-native/test-bun/preload"]
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

