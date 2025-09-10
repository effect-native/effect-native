/**
 * TestRunner Effect service: provides the active test runner API (it, expect).
 * Helpers can read this service from the Effect environment or use a default Layer.
 * @since 0.0.1
 */
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"

/**
 * The `it` callable provided by the bound runner (Vitest, Bun, etc.).
 * @since 0.0.1
 */
export type Test = {
  (
    name: string,
    fn: () => unknown,
    options?: unknown
  ): unknown
}

type Expect = {
  (value: unknown): unknown
}

/**
 * The TestRunner service shape.
 * @since 0.0.1
 */
export interface TestRunnerShape {
  readonly it: Test
  readonly test: Test
  readonly expect: Expect
}

/**
 * Effect Tag for accessing the current TestRunner.
 * @since 0.0.1
 */
export class TestRunner extends Context.Tag("@effect-native/test/TestRunner")<
  TestRunner,
  TestRunnerShape
>() {}

/**
 * Constructs a Layer providing the TestRunner service.
 * @since 0.0.1
 */
export const layer = (api: TestRunnerShape): Layer.Layer<TestRunner> => Layer.succeed(TestRunner, api)

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
export const getDefaultLayer = () => defaultLayer
