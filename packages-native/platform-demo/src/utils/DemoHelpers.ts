/**
 * @since 0.0.1
 */
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Runtime from "effect/Runtime"

/**
 * @since 0.0.1
 * @category utilities
 */
export const logSection = (title: string) => Console.log(`\n${"=".repeat(50)}\n${title}\n${"=".repeat(50)}`)

/**
 * @since 0.0.1
 * @category utilities
 */
export const logDemo = (name: string, description: string) => Console.log(`\n📋 ${name}: ${description}`)

/**
 * @since 0.0.1
 * @category utilities
 */
export const logResult = <A>(label: string, value: A) => Console.log(`✅ ${label}:`, value)

/**
 * @since 0.0.1
 * @category utilities
 */
export const logError = (label: string, error: unknown) => Console.error(`❌ ${label}:`, error)

/**
 * @since 0.0.1
 * @category utilities
 */
export const withTiming = <A, E, R>(
  label: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Effect.gen(function*() {
    const start = Date.now()
    const result = yield* effect
    const duration = Date.now() - start
    yield* Console.log(`⏱️  ${label} took ${duration}ms`)
    return result
  })

/**
 * @since 0.0.1
 * @category utilities
 */
export const runDemo = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<Option.Option<A>, never, R> =>
  Effect.gen(function*() {
    yield* logDemo(name, "Starting...")
    const result = yield* Effect.either(effect)
    if (result._tag === "Right") {
      yield* logResult(name, result.right)
      return Option.some(result.right)
    } else {
      yield* logError(name, result.left)
      return Option.none()
    }
  })

/**
 * @since 0.0.1
 * @category utilities
 */
export const makeDemoRunner = <R>(runtime: Runtime.Runtime<R>) =>
<A, E>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Promise<Option.Option<A>> => Runtime.runPromise(runtime)(runDemo(name, effect))
