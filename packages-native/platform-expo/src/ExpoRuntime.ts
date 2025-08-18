/**
 * @since 1.0.0
 */
import * as Runtime from "effect/Runtime"
import * as FiberSet from "effect/FiberSet"
import type * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as ExpoContext from "./ExpoContext.js"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain = <E, A>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
    readonly teardown?: ((exit: Fiber.RuntimeFiber<A, E>) => void) | undefined
  }
): void => {
  const layer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  const runtime = Runtime.make({
    layer,
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })

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
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
  }
): Fiber.RuntimeFiber<A, E> => {
  const layer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  const runtime = Runtime.make({
    layer,
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })

  return runtime.unsafeRunFiber(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runPromise = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
  }
): Promise<A> => {
  const layer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  const runtime = Runtime.make({
    layer,
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })

  return runtime.unsafeRunPromise(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runSync = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>,
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
  }
): A => {
  const layer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  const runtime = Runtime.make({
    layer,
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })

  return runtime.unsafeRunSync(effect)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const make = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>,
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
  }
): Runtime.Runtime<R> => {
  const baseLayer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  return Runtime.make({
    layer: baseLayer.pipe(Layer.provide(layer)),
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const makeDisposable = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>,
  options?: {
    readonly disableErrorReporting?: boolean | undefined
    readonly disablePrettyLogger?: boolean | undefined
  }
): Effect.Effect<Runtime.Runtime<R>, never, Scope.Scope> => {
  const baseLayer = options?.disablePrettyLogger === true
    ? ExpoContext.layer
    : ExpoContext.layer.pipe(Runtime.withPrettyLogger)

  return Runtime.makeDisposable({
    layer: baseLayer.pipe(Layer.provide(layer)),
    memoMap: options?.disableErrorReporting === true
      ? Runtime.MemoMapFromSelf
      : Runtime.MemoMapFromSelf.pipe(Runtime.enableErrorReporting)
  })
}