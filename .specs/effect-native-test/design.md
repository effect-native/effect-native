# @effect-native/test — Phase 3 Design

## Effect Patterns
- Use Effect v3.17+ idioms; allow `yield* new Error()`; avoid `try/catch` in generators.
- Provide `it.effect(name, Effect)` helper that runs with `Effect.runPromise` and surfaces failures through the bound runner’s `it`.

## Type Safety
- No `as any` or unsafe double assertions. Prefer precise generics for `it.effect` and the binding registry.
- Ambient types (`test-env.d.ts`) are optional and limited to declaring globals for authoring convenience; they do not add runtime globals.

## Module Architecture
- src/internal/registry.ts
  - A tiny mutable registry (module-local) that holds the active bindings:
    - type Bindings = { describe: Fn; it: ItAPI; expect: ExpectAPI }
    - setBindings(bindings: Bindings): void — called by adapters (setup/preload).
    - getBindings(): Bindings — throws a clear error if not initialized and no safe fallback exists.
    - Fallback: On Node/Bun if not initialized, attempt to read from globalThis (`describe`, `it`, `expect`) to avoid double setup.
- src/it.ts
  - Implements `it.effect` by delegating to the active `it` and wrapping Effects with `Effect.runPromise`.
  - Exports placeholders `it.scoped`, `it.live` for later extensions (type-only in v0).
- src/index.ts
  - Re-exports bound `describe`, `it`, `expect` as accessors over the registry.
  - Re-exports `setBindings` (or `bind`) for adapters.
  - Re-exports types for `Bindings`, `TestRunner` shape.
- templates/test-env.d.ts
  - Ambient declarations for `describe`, `it`, `expect`, hooks, and `it.effect` (type-only).

## Error Handling Strategy
- Fail fast when bindings are missing: `getBindings()` throws with actionable remediation: “No test adapter detected. Run: pnpm dlx github:effect-native/test --init”.
- When falling back to Node/Bun globals and those are missing, fail fast with “Runner globals not found; configure a runner via --init”.

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
- Vitest/Bun adapters call `setBindings` during their setup/preload and return wrappers for `it` that handle Effect execution.
- Browser/RN harnesses call `setBindings` once the embedded engine (Jasmine/Mocha) is bootstrapped.

