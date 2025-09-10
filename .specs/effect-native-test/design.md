# @effect-native/test — Phase 3 Design

## Effect Patterns
- Use Effect v3.17+ idioms; allow `yield* new Error()`; avoid `try/catch` in generators.
- Provide `it.effect(name, Effect)` helper that runs with `Effect.runPromise` and surfaces failures through the bound runner’s `it`.

## Type Safety
- No `as any` or unsafe double assertions. Prefer precise generics for `it.effect` and the binding registry.
- Ambient types (`test-env.d.ts`) are optional and limited to declaring globals for authoring convenience; they do not add runtime globals.

## Module Architecture
- src/service/TestApi.ts
  - Define an Effect Service describing the runner API exposed to helpers:
    - `TestApi` with fields `{ readonly it: RunnerIt; readonly expect: ExpectAPI }`.
    - `RunnerIt` is the underlying runner’s `it` API surface that adapters supply.
  - Provide constructor and Tag for `TestApi`.
- src/it.ts
  - Implement `itEffect(name, effect)` as a function that reads `TestApi` via Effect environment and delegates to the underlying runner `it`, wrapping the Effect with `Effect.runPromise` (cancellation semantics owned by adapter layer).
  - Export helpers (functions) rather than mutating the runner’s `it`. Adapters may also choose to extend the runner’s `it` with an `effect` method in their setup files for ergonomics.
- src/index.ts
  - Export types and helpers: `itEffect`, `TestApi` Tag, and convenience combinators to build adapter Layers.
- templates/test-env.d.ts
  - Ambient declarations for global `describe`/`it`/`expect` (type-only) and a global declaration for `it.effect` that points to the adapter-extended `it` when present.

## Error Handling Strategy
- Fail fast if `TestApi` is not provided in the environment when helper functions are used: “No test adapter detected. Run: pnpm dlx github:effect-native/test --init”.
- Adapters own cancellation and equality semantics; helper code stays minimal and defers to the provided Layer.

## Testing Strategy
- Unit tests with Vitest (in this monorepo):
  - Registry sets/gets, fallbacks to Node/Bun globals in a simulated environment.
  - `it.effect` propagates Effect failures as test failures.
- Integration smoke:
  - Sample suite importing from `@effect-native/test` runs via Vitest and Bun adapters.

## JSDoc Plan
- Document public API in `src/index.ts` with `@since` and `@example` (authoring example with `it.effect`).
- Document adapter contract (`setBindings`) and the meaning of the registry.

## Code Examples
- Authoring (works in all environments):
  ```ts
  import { describe, it, expect } from "@effect-native/test"
  import * as Effect from "effect/Effect"
  
  describe("math", () => {
    it("adds", () => expect(1 + 2).toBe(3))
    it.effect("effectful", () => Effect.gen(function* () { expect(5).toBe(5) }))
  })
  ```
- Adapter bootstrap (Vitest setup/preload pseudo-code):
  ```ts
  import { setBindings } from "@effect-native/test"
  import { describe, it, expect } from "vitest"
  setBindings({ describe, it, expect })
  ```

## Integration Points
- Vitest/Bun adapters provide a `Layer<TestApi>` that supplies `{ it, expect }` from the underlying runner and, in setup/preload, may also extend the runner’s `it` with an `effect` method for global ergonomics.
- Browser/RN harnesses provide a `Layer<TestApi>` after bootstrapping Jasmine/Mocha and bind it during manifest execution.

### Example: provide TestApi via Layer.succeed
```ts
import * as Layer from "effect/Layer"
import { TestApi } from "@effect-native/test/service/TestApi"
import { describe, it, expect } from "vitest" // or bun:test / harness API

export const testApiLayer = Layer.succeed(TestApi, { it, expect })

// Later, helpers like itEffect read TestApi from the environment:
// Effect.provide(itEffect(name, eff), testApiLayer)
```
