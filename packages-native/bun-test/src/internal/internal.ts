/**
 * @since 0.1.0
 */
import * as B from "bun:test"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as fc from "effect/testing/FastCheck"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"

// Use our package's BunTest types from a dedicated types module to avoid cycles
import type { BunTest } from "../types.js"

/**
 * Executes an Effect and returns a Promise that resolves to the result or throws an error.
 * Handles interruption and multiple errors gracefully.
 *
 * @internal
 */
const runPromise = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exit = yield* Effect.exit(effect)
    if (Exit.isSuccess(exit)) {
      return () => exit.value
    } else {
      if (Cause.hasInterruptsOnly(exit.cause)) {
        return () => {
          throw new Error("All fibers interrupted without errors.")
        }
      }
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 1; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
      return () => {
        throw errors[0]
      }
    }
  }).pipe(Effect.runPromise).then((f) => f())

/**
 * Runs a test Effect by converting it to a Promise.
 *
 * @internal
 */
const runTest = <E, A>(effect: Effect.Effect<A, E>) => runPromise(effect)

/**
 * Test environment layer that provides TestClock and TestConsole.
 *
 * @internal
 */
const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

/**
 * Custom equality tester for Effect data types that implement Equal.
 * Returns true if values are equal, false if not, undefined if not applicable.
 *
 * @internal
 */
function customTester(a: unknown, b: unknown): boolean | undefined {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }
  return Equal.equals(a, b)
}

/**
 * Extends Bun's expect with custom equality checking for Effect's Equal instances.
 * This allows proper comparison of Option, Either, and other Effect data types.
 *
 * @internal
 */
export const addEqualityTesters = () => {
  // Bun doesn't have addEqualityTesters, but we can extend expect
  const originalToEqual = B.expect.prototype.toEqual
  B.expect.prototype.toEqual = function(expected: unknown) {
    const actual = (this as any).value
    const result = customTester(actual, expected)
    if (result !== undefined) {
      if (!result) {
        throw new Error(`Expected values to be equal`)
      }
      return this
    }
    return originalToEqual.call(this, expected)
  }
}

/**
 * Factory function for creating test runners with different execution contexts.
 * Handles all test modifiers (skip, only, etc.) and property-based testing.
 *
 * @internal
 */
const makeTester = <R>(
  mapEffect: (self: Effect.Effect<any, any, any>) => Effect.Effect<any, any, never>
): any => {
  const run = <A, E, TestArgs extends Array<unknown>>(
    args: TestArgs,
    self: BunTest.TestFunction<A, E, R, TestArgs>
  ) => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest)

  const f: BunTest.Test<R> = (name, self, timeout) => B.test(name, () => run([], self), timeout)

  const skip: BunTest.Tester<R>["skip"] = (name, self, timeout) => B.test.skip(name, () => run([], self), timeout)

  const skipIf = (condition: unknown) => {
    if (condition) {
      return skip
    }
    return f
  }

  const runIf = (condition: unknown) => {
    if (condition) {
      return f
    }
    return skip
  }

  const only: BunTest.Tester<R>["only"] = (name, self, timeout) => B.test.only(name, () => run([], self), timeout)

  const each = <T>(cases: ReadonlyArray<T>) =>
  <A, E>(
    name: string,
    self: BunTest.TestFunction<A, E, R, [T]>,
    timeout?: number
  ) => {
    cases.forEach((testCase, index) => {
      B.test(`${name} [${index}]`, () => run([testCase], self), timeout)
    })
  }

  const failing: BunTest.Tester<R>["failing"] = (name, self, timeout) =>
    B.test.failing(name, () => run([], self), timeout)

  const todo: BunTest.Tester<R>["todo"] = (name) => B.test.todo(name, () => {})

  const prop: any = (name: string, arbitraries: any, self: any, options?: any) => {
    const timeout = typeof options === "number" ? options : options?.timeout
    const params = typeof options === "object" ? options.fastCheck : undefined

    B.test(name, async () => {
      const arbs: Record<string, fc.Arbitrary<any>> = {}
      const entries = Array.isArray(arbitraries)
        ? arbitraries.map((arb, i) => [i, arb])
        : Object.entries(arbitraries)

      for (const [key, arb] of entries) {
        if (Schema.isSchema(arb)) {
          arbs[key] = Schema.toArbitrary(arb)
        } else {
          arbs[key] = arb
        }
      }

      const property = fc.property(
        ...Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>],
        (...values: Array<any>) => {
          const props = Array.isArray(arbitraries)
            ? values
            : Object.keys(arbitraries).reduce((acc, key, i) => {
              acc[key] = values[i]
              return acc
            }, {} as any)

          return pipe(
            Effect.suspend(() => self(props)),
            mapEffect,
            runTest
          ) as any
        }
      )

      await fc.assert(property, params as any)
    }, timeout)
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, failing, todo, prop }) as any
}

/**
 * Test runner that provides TestServices (TestClock, TestRandom, etc.) for deterministic testing.
 *
 * @internal
 */
export const effect = makeTester((effect: Effect.Effect<any, any, any>) =>
  Effect.provide(effect, TestEnv) as Effect.Effect<any, any, never>
)

/**
 * Test runner that provides TestServices and automatic resource management via Scope.
 *
 * @internal
 */
export const scoped = makeTester(
  (effect: Effect.Effect<any, any, any>) =>
    Effect.scoped(effect).pipe(Effect.provide(TestEnv)) as Effect.Effect<any, any, never>
)

/**
 * Test runner for integration tests without TestServices.
 *
 * @internal
 */
export const live = makeTester((effect: Effect.Effect<any, any, any>) => effect as Effect.Effect<any, any, never>)

/**
 * Test runner for integration tests with resource management but without TestServices.
 *
 * @internal
 */
export const scopedLive = makeTester((effect: Effect.Effect<any, any, any>) =>
  Effect.scoped(effect) as Effect.Effect<any, any, never>
)

/**
 * Retries a flaky test up to 100 times or until timeout.
 * Uses exponential backoff with jitter for retry delays.
 *
 * @internal
 */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.Input = Duration.seconds(30)
) => {
  return pipe(
    self,
    Effect.scoped,
    Effect.sandbox,
    Effect.retry(pipe(
      Schedule.recurs(100),
      // Justification: Schedule.while is a reserved keyword export alias; ts cannot infer imported 'while' directly
      // Approved-by: @effect-native/bun-test migration (PR #222)
      (Schedule as any).while((_: any) =>
        Effect.succeed(
          Duration.isLessThanOrEqualTo(
            Duration.fromInputUnsafe(_.elapsed),
            Duration.fromInputUnsafe(timeout)
          )
        )
      )
    )),
    Effect.orDie
  ) as Effect.Effect<A, never, R>
}

/**
 * Creates a test suite with a shared Layer that's initialized once and reused across tests.
 * Supports nested layers and automatic cleanup after all tests complete.
 *
 * @internal
 */
export const layer = <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.Input
  }
): {
  (f: (it: BunTest.Methods<R>) => void): void
  (name: string, f: (it: BunTest.Methods<R>) => void): void
} => {
  const withTestEnv = Layer.provideMerge(layer_, TestEnv)
  const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap)
  const scope = Effect.runSync(Scope.make())
  const contextEffect = Layer.buildWithMemoMap(withTestEnv, memoMap, scope).pipe(
    Effect.orDie,
    Effect.cached,
    Effect.runSync
  )

  const teardown = () => {
    Effect.runSync(Scope.close(scope, Exit.void))
  }

  const methods: any = {
    effect: makeTester((effect) =>
      Effect.flatMap(contextEffect, (context) => effect.pipe(Effect.provide(context))) as any
    ),
    scoped: makeTester((effect) =>
      Effect.flatMap(contextEffect, (context) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(context)
        )) as any
    ),
    live: makeTester((effect) =>
      Effect.flatMap(contextEffect, (context) => effect.pipe(Effect.provide(context))) as any
    ),
    scopedLive: makeTester((effect) =>
      Effect.flatMap(contextEffect, (context) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(context)
        )) as any
    ),
    flakyTest,
    layer: <R2, E2>(innerLayer: Layer.Layer<R2, E2, R>, innerOptions?: any) => {
      const combined = Layer.provideMerge(innerLayer, withTestEnv)
      return layer(combined, { ...options, ...innerOptions, memoMap })
    },
    prop: (name: string, arbitraries: any, self: any, propOptions?: any) => {
      const timeout = typeof propOptions === "number" ? propOptions : propOptions?.timeout
      const params = typeof propOptions === "object" ? propOptions.fastCheck : undefined

      B.test(name, async () => {
        await Effect.runPromise(contextEffect) // Initialize the layer
        const arbs: Record<string, fc.Arbitrary<any>> = {}
        const entries = Array.isArray(arbitraries)
          ? arbitraries.map((arb: any, i: number) => [i, arb])
          : Object.entries(arbitraries)

        for (const [key, arb] of entries) {
          if (Schema.isSchema(arb)) {
            arbs[key] = Schema.toArbitrary(arb)
          } else {
            arbs[key] = arb
          }
        }

        const property = fc.property(
          ...Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>],
          (...values: Array<any>) => {
            const props = Array.isArray(arbitraries)
              ? values
              : Object.keys(arbitraries).reduce((acc, key, i) => {
                acc[key] = values[i]
                return acc
              }, {} as any)

            self(props)
          }
        )

        await fc.assert(property, params as any)
      }, timeout)
    }
  }

  return function(
    nameOrF: string | ((it: BunTest.Methods<R>) => void),
    f?: (it: BunTest.Methods<R>) => void
  ) {
    if (typeof nameOrF === "string") {
      B.describe(nameOrF, () => {
        f!(methods)
        B.afterAll(teardown)
      })
    } else {
      nameOrF(methods)
      B.afterAll(teardown)
    }
  }
}

/**
 * Property-based testing using FastCheck.
 * Automatically converts Schema to Arbitrary and runs multiple test cases.
 *
 * @internal
 */
export const prop: any = (name: string, arbitraries: any, self: any, options?: any) => {
  const timeout = typeof options === "number" ? options : options?.timeout
  const params = typeof options === "object" ? options.fastCheck : undefined

  B.test(name, async () => {
    const arbs: Record<string, fc.Arbitrary<any>> = {}
    const entries = Array.isArray(arbitraries)
      ? arbitraries.map((arb: any, i: number) => [i, arb])
      : Object.entries(arbitraries)

    for (const [key, arb] of entries) {
      if (Schema.isSchema(arb)) {
        arbs[key as string] = Schema.toArbitrary(arb)
      } else {
        arbs[key as string] = arb as fc.Arbitrary<any>
      }
    }

    const property = fc.property(
      ...(Object.values(arbs) as [fc.Arbitrary<any>, ...Array<fc.Arbitrary<any>>]),
      (...values: Array<any>) => {
        const props = Array.isArray(arbitraries)
          ? values
          : Object.keys(arbitraries).reduce((acc, key, i) => {
            acc[key] = values[i]
            return acc
          }, {} as any)

        self(props)
      }
    )

    await fc.assert(property, params)
  }, timeout)
}
