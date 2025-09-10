/**
 * @since 0.0.1
 */
import * as Effect from "effect/Effect"
import * as TestRunner from "./services/TestRunner.js"

/**
 * Runs an Effect as a test using the underlying runner's `it` implementation.
 * Requires `TestRunner` to be provided (either explicitly or via `setDefaultLayer`).
 * @since 0.0.1
 */
export function testEffect(name: string, effect: Effect.Effect<unknown, unknown, never>, options?: unknown) {
  const program = Effect.flatMap(
    TestRunner.TestRunner,
    (api) => Effect.sync(() => api.it(name, () => Effect.runPromise(effect), options))
  )
  const layer = TestRunner.getDefaultLayer()
  if (layer) {
    Effect.runSync(Effect.provide(program, layer))
  } else {
    throw new Error("No test adapter detected. Run: pnpm dlx github:effect-native/test --init")
  }
}
