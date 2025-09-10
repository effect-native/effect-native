import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export type RunnerIt = (
  name: string,
  fn: () => unknown,
  options?: unknown
) => unknown

export interface Service {
  readonly it: RunnerIt
  readonly expect: unknown
}

export class TestRunner extends Context.Tag("@effect-native/test/TestRunner")<
  TestRunner,
  Service
>() {}

export const layer = (api: Service): Layer.Layer<TestRunner> => Layer.succeed(TestRunner, api)

let defaultLayer: Layer.Layer<TestRunner> | null = null

export const setDefaultLayer = (l: Layer.Layer<TestRunner>) => {
  defaultLayer = l
}

export const withDefaultLayer = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | TestRunner> => {
  if (!defaultLayer) return effect
  return Effect.provide(effect, defaultLayer)
}
