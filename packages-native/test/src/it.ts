import * as Effect from "effect/Effect"
import { TestRunner, withDefaultLayer } from "./service/TestRunner"

/**
 * Runs an Effect as a test using the underlying runner's `it` implementation.
 * Requires `TestRunner` to be provided (either explicitly or via `setDefaultLayer`).
 * @since 0.0.1
 */
export const itEffect = (
  name: string,
  effect: Effect.Effect<unknown, unknown, unknown>,
  options?: unknown
) => {
  const program = Effect.flatMap(TestRunner, (api) =>
    Effect.sync(() => api.it(name, () => Effect.runPromise(effect), options))
  )
  Effect.runSync(withDefaultLayer(program))
}

