/**
 * TestRunner Effect service: provides the active test runner API (it, expect).
 * Helpers can read this service from the Effect environment or use a default Layer.
 * @since 0.0.1
 */
/**
 * @since 0.0.1
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * The `it` callable provided by the bound runner (Vitest, Bun, etc.).
 * @since 0.0.1
 */
export type RunnerIt = (
  name: string,
  fn: () => unknown,
  options?: unknown
) => unknown

/**
 * The TestRunner service shape.
 * @since 0.0.1
 */
export interface Service {
  readonly it: RunnerIt
  readonly expect: unknown
}

/**
 * Effect Tag for accessing the current TestRunner.
 * @since 0.0.1
 */
export class TestRunner extends Context.Tag("@effect-native/test/TestRunner")<
  TestRunner,
  Service
>() {}

/**
 * Constructs a Layer providing the TestRunner service.
 * @since 0.0.1
 */
export const layer = (api: Service): Layer.Layer<TestRunner> => Layer.succeed(TestRunner, api)

let defaultLayer: Layer.Layer<TestRunner> | null = null

/**
 * Installs a default Layer used by helpers when none is explicitly provided.
 * @since 0.0.1
 */
export const setDefaultLayer = (l: Layer.Layer<TestRunner>) => {
  defaultLayer = l
}

/**
 * Returns the currently installed default Layer, if any.
 * @since 0.0.1
 */
export const getDefaultLayer = (): Layer.Layer<TestRunner> | null => defaultLayer

/**
 * Provides the default TestRunner layer to an Effect if configured.
 * @since 0.0.1
 */
export const withDefaultLayer = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | TestRunner> => {
  if (!defaultLayer) return effect
  return Effect.provide(effect, defaultLayer)
}
