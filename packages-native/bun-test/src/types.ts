/**
 * @since 0.1.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as FC from "effect/testing/FastCheck"
import type * as TestClock from "effect/testing/TestClock"
import type * as TestConsole from "effect/testing/TestConsole"

/**
 * The test services provided by the test environment (TestClock + TestConsole).
 * @since 0.1.0
 */
export type TestServices = TestClock.TestClock | TestConsole.TestConsole

/**
 * Public types for the Effect-enabled Bun test API.
 * @since 0.1.0
 */
export namespace BunTest {
  /** A test function that returns an Effect. */
  export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
    (...args: TestArgs): Effect.Effect<A, E, R>
  }

  /** Basic test interface for creating Effect-based tests. */
  export interface Test<R> {
    <A, E>(
      name: string,
      self: TestFunction<A, E, R, []>,
      timeout?: number
    ): void
  }

  /** Arbitraries used by property tests. */
  export type Arbitraries =
    | Array<Schema.Schema<any> | FC.Arbitrary<any>>
    | { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> }

  /** Extended test interface with modifiers and utilities. */
  export interface Tester<R> extends BunTest.Test<R> {
    skip: BunTest.Test<R>
    skipIf: (condition: unknown) => BunTest.Test<R>
    runIf: (condition: unknown) => BunTest.Test<R>
    only: BunTest.Test<R>
    each: <T>(
      cases: ReadonlyArray<T>
    ) => <A, E>(name: string, self: TestFunction<A, E, R, [T]>, timeout?: number) => void
    failing: BunTest.Test<R>
    todo: BunTest.Test<R>
    prop: <const Arbs extends Arbitraries, A, E>(
      name: string,
      arbitraries: Arbs,
      self: TestFunction<
        A,
        E,
        R,
        [
          {
            [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Arbs[K] extends Schema.Schema<infer T> ? T
            : never
          }
        ]
      >,
      timeout?: number | {
        timeout?: number
        fastCheck?: FC.Parameters<
          {
            [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T
              : Arbs[K] extends Schema.Schema<infer T> ? T
              : never
          }
        >
      }
    ) => void
  }

  /** Complete test methods interface including Effect utilities. */
  export interface Methods<R = never> {
    (name: string, fn: () => void | Promise<void>, timeout?: number): void
    readonly effect: BunTest.Tester<TestServices | R>
    readonly flakyTest: <A, E, R2>(
      self: Effect.Effect<A, E, R2>,
      timeout?: Duration.Input
    ) => Effect.Effect<A, never, R2>
    readonly scoped: BunTest.Tester<TestServices | Scope.Scope | R>
    readonly live: BunTest.Tester<R>
    readonly scopedLive: BunTest.Tester<Scope.Scope | R>
    readonly layer: <R2, E>(
      layer_: Layer.Layer<R2, E, R>,
      options?: { readonly memoMap?: Layer.MemoMap; readonly timeout?: Duration.Input }
    ) => {
      (f: (it: BunTest.Methods<R | R2>) => void): void
      (name: string, f: (it: BunTest.Methods<R | R2>) => void): void
    }
    readonly prop: BunTest.Tester<R>["prop"]
    readonly todo: (name: string) => void
  }
}
