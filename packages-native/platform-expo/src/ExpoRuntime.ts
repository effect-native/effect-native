/**
 * @since 1.0.0
 */
import * as Runtime from "effect/Runtime"
import * as FiberSet from "effect/FiberSet"
import type * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as ExpoContext from "./ExpoContext.js"

/**
 * Runtime configuration options
 */
type RuntimeOptions = {
  readonly disableErrorReporting?: boolean | undefined
  readonly disablePrettyLogger?: boolean | undefined
}

/**
 * Helper to create runtime configuration from options
 */
const makeRuntimeConfig = (options?: RuntimeOptions) => ({
  layer: options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger),
  memoMap: options?.disableErrorReporting === true
    ? Runtime.MemoMapFromSelf
    : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
})

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain = <E, A>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: RuntimeOptions & {
    readonly teardown?: ((exit: Fiber.RuntimeFiber<A, E>) => void) | undefined
  }
): void => {
  const runtime = Runtime.make(makeRuntimeConfig(options))
  const fiber = runtime.unsafeRunFiber(effect)

  if (options?.teardown) {
    fiber.addObserver(() => {
      options.teardown!(fiber)
    })
  }
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runFork = <E, A>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: RuntimeOptions
): Fiber.RuntimeFiber<A, E> => {
  const runtime = Runtime.make(makeRuntimeConfig(options))
  return runtime.unsafeRunFiber(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runPromise = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: RuntimeOptions
): Promise<A> => {
  const runtime = Runtime.make(makeRuntimeConfig(options))
  return runtime.unsafeRunPromise(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runSync = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: RuntimeOptions
): A => {
  const runtime = Runtime.make(makeRuntimeConfig(options))
  return runtime.unsafeRunSync(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const make = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>,
  options?: RuntimeOptions
): Runtime.Runtime<R> => {
  const config = makeRuntimeConfig(options)
  return Runtime.make({
    layer: config.layer.pipe(Layer.provide(layer)),
    memoMap: config.memoMap
  })
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const makeDisposable = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>,
  options?: RuntimeOptions
): Effect.Effect<Runtime.Runtime<R>, never, Scope.Scope> => {
  const config = makeRuntimeConfig(options)
  return Runtime.makeDisposable({
    layer: config.layer.pipe(Layer.provide(layer)),
    memoMap: config.memoMap
  })
}