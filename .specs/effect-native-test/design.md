# @effect-native/test — Phase 3 Design

## Effect Patterns
- Use Effect v3.17+ idioms; allow `yield* new Error()`; avoid `try/catch` in generators.
- Provide `it.effect(name, Effect)` helper that runs with `Effect.runPromise` and surfaces failures through the bound runner’s `it`.

## Type Safety
- No `as any` or unsafe double assertions. Prefer precise generics for `it.effect` and the binding registry.
- Ambient types (`test-env.d.ts`) are optional and limited to declaring globals for authoring convenience; they do not add runtime globals.

## Module Architecture
- src/service/TestRunner.ts
  - Define an Effect Service describing the runner API exposed to helpers:
    - `TestRunner` service with fields `{ readonly it: RunnerIt; readonly expect: ExpectAPI }`.
    - `RunnerIt` is the underlying runner’s `it` API surface that adapters supply.
  - Export Tag for `TestRunner` and helpers:
    - `TestRunner.layer({ it, expect })` → `Layer<TestRunner>`
    - `TestRunner.setDefaultLayer(layer)` to configure a default Layer used by helpers when none is explicitly provided (DX convenience; optional).
- src/it.ts
  - Implement `itEffect(name, effect)` as a function that reads `TestRunner` via Effect environment and delegates to the underlying runner `it`, wrapping the Effect with `Effect.runPromise` (cancellation semantics owned by adapter layer).
  - Export helpers (functions) rather than mutating the runner’s `it`. Adapters may also choose to extend the runner’s `it` with an `effect` method in their setup files for ergonomics.
- src/index.ts
  - Export types and helpers: `itEffect`, `TestRunner` Tag + helpers, and convenience combinators to build adapter Layers.
- templates/test-env.d.ts
  - Ambient declarations for global `describe`/`it`/`expect` (type-only) and a global declaration for `it.effect` that points to the adapter-extended `it` when present.

## Error Handling Strategy
- If no Layer is provided explicitly, helpers use the `TestRunner` default Layer when set.
- If neither an explicit nor a default Layer is available, fail fast: “No test adapter detected. Run: pnpm dlx github:effect-native/test --init”.
- Adapters own cancellation and equality semantics; helper code stays minimal and defers to the provided Layer.

## Testing Strategy
- Unit tests with Vitest (in this monorepo):
  - Default Layer behavior: helpers use default when set; otherwise require explicit provide.
  - `it.effect` propagates Effect failures as test failures.
- Integration smoke:
  - Sample suite importing from `@effect-native/test` runs via Vitest and Bun adapters.

## JSDoc Plan
- Document public API in `src/index.ts` with `@since` and `@example` (authoring example with `it.effect`).
- Document adapter contract as Layer provisioning: `TestRunner.layer({...})` and optional `TestRunner.setDefaultLayer(...)`.

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
  import { TestRunner } from "@effect-native/test"
  import { it, expect } from "vitest"
  TestRunner.setDefaultLayer(TestRunner.layer({ it, expect }))
  ```

## Integration Points
- Vitest/Bun adapters provide a `Layer<TestRunner>` that supplies `{ it, expect }` from the underlying runner and, in setup/preload, may also extend the runner’s `it` with an `effect` method for global ergonomics.
- Browser/RN harnesses provide a `Layer<TestRunner>` after bootstrapping Jasmine/Mocha and bind it during manifest execution.

### Example: provide TestRunner via Layer.succeed
```ts
import * as Layer from "effect/Layer"
import { TestRunner } from "@effect-native/test/services/TestRunner"
import { it, expect } from "vitest" // or bun:test / harness API

export const testLayer = Layer.succeed(TestRunner, { it, expect })

// Later, helpers like itEffect read TestRunner from the environment:
// Effect.provide(itEffect(name, eff), testLayer)
// Or set a default layer for convenience:
// TestRunner.setDefaultLayer(TestRunner.layer({ it, expect }))
```
