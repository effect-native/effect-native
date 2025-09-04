/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/internal.js"

/**
 * Runtime configuration for multi-runtime test execution.
 *
 * @since 1.0.0
 * @category Model
 */
export interface RuntimeConfig {
  readonly name: string
  readonly version?: string
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env?: Record<string, string>
  readonly timeout?: number
}

/**
 * Result of running tests in a specific runtime.
 *
 * @since 1.0.0
 * @category Model
 */
export interface RuntimeResult {
  readonly runtime: RuntimeConfig
  readonly success: boolean
  readonly output: string
  readonly duration: number
  readonly testResults?: {
    readonly passed: number
    readonly failed: number
    readonly total: number
  }
}

/**
 * Service for executing tests across multiple runtimes.
 *
 * @since 1.0.0
 * @category Service
 */
export interface MultiRuntimeTestRunner {
  readonly runTests: (
    testPattern: string,
    runtimes: ReadonlyArray<RuntimeConfig>
  ) => Effect.Effect<ReadonlyArray<RuntimeResult>, MultiRuntimeTestRunner.Error>

  readonly runTestsParallel: (
    testPattern: string,
    runtimes: ReadonlyArray<RuntimeConfig>
  ) => Effect.Effect<ReadonlyArray<RuntimeResult>, MultiRuntimeTestRunner.Error>
}

/**
 * @since 1.0.0
 * @category Service
 */
export namespace MultiRuntimeTestRunner {
  /**
   * @since 1.0.0
   * @category Error
   */
  export interface Error {
    readonly _tag: "MultiRuntimeTestRunnerError"
    readonly message: string
    readonly runtime?: RuntimeConfig
    readonly cause?: unknown
  }
}

/**
 * Tag for the MultiRuntimeTestRunner service.
 *
 * @since 1.0.0
 * @category Tag
 * @example
 * import { MultiRuntimeTestRunner } from "@effect-native/multi-runtime-test-runner"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const runner = yield* MultiRuntimeTestRunner
 *   const results = yield* runner.runTests("**/*.test.ts", [
 *     { name: "node", version: "18", command: "node", args: [] },
 *     { name: "bun", command: "bun", args: [] }
 *   ])
 *   return results
 * })
 */
export const MultiRuntimeTestRunner: MultiRuntimeTestRunner = internal.MultiRuntimeTestRunner

/**
 * Default runtime configurations for Node.js, Bun, and Browser.
 *
 * @since 1.0.0
 * @category Runtime
 */
export const defaultRuntimes: {
  readonly node: (version?: string) => RuntimeConfig
  readonly bun: RuntimeConfig
  readonly browser: RuntimeConfig
} = internal.defaultRuntimes

/**
 * Live implementation of the MultiRuntimeTestRunner service.
 *
 * @since 1.0.0
 * @category Layer
 */
export const MultiRuntimeTestRunnerLive: Layer.Layer<MultiRuntimeTestRunner> = internal.MultiRuntimeTestRunnerLive

/**
 * Run tests across multiple runtimes with the provided configuration.
 *
 * @since 1.0.0
 * @category Utilities
 * @example
 * import { runMultiRuntimeTests, defaultRuntimes } from "@effect-native/multi-runtime-test-runner"
 * import { Effect } from "effect"
 *
 * const program = runMultiRuntimeTests("**/*.test.ts", [
 *   defaultRuntimes.node("18"),
 *   defaultRuntimes.node("20"),
 *   defaultRuntimes.bun,
 *   defaultRuntimes.browser
 * ])
 *
 * Effect.runPromise(program).then(console.log)
 */
export const runMultiRuntimeTests: (
  testPattern: string,
  runtimes: ReadonlyArray<RuntimeConfig>
) => Effect.Effect<ReadonlyArray<RuntimeResult>, MultiRuntimeTestRunner.Error, MultiRuntimeTestRunner> = 
  internal.runMultiRuntimeTests

/**
 * Run tests across multiple runtimes in parallel.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const runMultiRuntimeTestsParallel: (
  testPattern: string,
  runtimes: ReadonlyArray<RuntimeConfig>
) => Effect.Effect<ReadonlyArray<RuntimeResult>, MultiRuntimeTestRunner.Error, MultiRuntimeTestRunner> = 
  internal.runMultiRuntimeTestsParallel

/**
 * @since 1.0.0
 */
export * from "./internal/internal.js"