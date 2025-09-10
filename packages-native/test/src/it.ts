/**
 * @since 0.0.1
 */
import * as Effect from "effect/Effect"
import { getDefaultLayer, TestRunner } from "./service/TestRunner.js"

/**
 * Runs an Effect as a test using the underlying runner's `it` implementation.
 * Requires `TestRunner` to be provided (either explicitly or via `setDefaultLayer`).
 * @since 0.0.1
 */
export const itEffect = (name: string, effect: Effect.Effect<unknown, unknown, never>, options?: unknown) => {
  const program = Effect.flatMap(
    TestRunner,
    (api) => Effect.sync(() => api.it(name, () => Effect.runPromise(effect), options))
  )
  const dl = getDefaultLayer()
  if (dl) {
    Effect.runSync(Effect.provide(program, dl))
  } else {
    throw new Error("No test adapter detected. Run: pnpm dlx github:effect-native/test --init")
  }
}
