// @ts-nocheck
/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import type { RunMain } from "@effect/platform/Runtime"
import { makeRunMain } from "@effect/platform/Runtime"
import * as ExpoContext from "./ExpoContext.js"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runFork = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>
): Fiber.RuntimeFiber<A, E> => {
  const runtime = Runtime.defaultRuntime
  const scoped = Effect.scoped(Effect.provide(effect, ExpoContext.layer))
  return Runtime.runFork(runtime)(scoped)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runSync = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>
): A => {
  const runtime = Runtime.defaultRuntime
  const scoped = Effect.scoped(Effect.provide(effect, ExpoContext.layer))
  return Runtime.runSync(runtime)(scoped)
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const runPromise = <A, E>(
  effect: Effect.Effect<A, E, ExpoContext.ExpoContext>
): Promise<A> => {
  const runtime = Runtime.defaultRuntime
  const scoped = Effect.scoped(Effect.provide(effect, ExpoContext.layer))
  return Runtime.runPromise(runtime)(scoped)
}

/**
 * Re-export of the platform RunMain with Expo-friendly defaults.
 *
 * @since 1.0.0
 * @category runtime
 */
export const runMain: RunMain = makeRunMain(({ fiber }) => {
  // In Expo/React Native there is no process / beforeunload handling.
  // We intentionally avoid process-exit semantics and only keep the fiber alive.
  void fiber
})

/**
 * Same as runMain, but auto-provides the ExpoContext.layer.
 *
 * @since 1.0.0
 * @category runtime
 */
export const runMainWithExpo: RunMain = ((arg1: any, arg2?: any) => {
  if (Effect.isEffect(arg1)) {
    return runMain(Effect.provide(arg1, ExpoContext.layer), arg2)
  }
  const options = arg1
  return (effect: Effect.Effect<any, any>) => runMain(options)(Effect.provide(effect, ExpoContext.layer))
}) as RunMain

/**
 * @since 1.0.0
 * @category runtime
 */
export const make = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>
): Runtime.Runtime<R> => {
  const fullLayer = Layer.mergeAll(ExpoContext.layer, layer)
  return Effect.runSync(Effect.scoped(Layer.toRuntime(fullLayer)))
}

/**
 * @since 1.0.0
 * @category runtime
 */
export const makeDisposable = <R>(
  layer: Layer.Layer<R, never, ExpoContext.ExpoContext>
): Effect.Effect<Runtime.Runtime<R>, never, Scope.Scope> => {
  const fullLayer = Layer.mergeAll(ExpoContext.layer, layer)
  return Layer.toRuntime(fullLayer)
}
