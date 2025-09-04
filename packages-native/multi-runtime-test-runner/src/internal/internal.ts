/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PlatformNode from "@effect/platform-node"
import { FileSystem } from "@effect/platform"
import type * as MultiRuntimeTestRunner from "../index.js"

/**
 * @since 1.0.0
 * @category Error
 */
export class MultiRuntimeTestRunnerError extends Data.TaggedError("MultiRuntimeTestRunnerError")<{
  readonly message: string
  readonly runtime?: MultiRuntimeTestRunner.RuntimeConfig
  readonly cause?: unknown
}> {}

/**
 * @since 1.0.0
 * @category Tag
 */
export const MultiRuntimeTestRunner = Context.GenericTag<MultiRuntimeTestRunner.MultiRuntimeTestRunner>(
  "@effect-native/multi-runtime-test-runner/MultiRuntimeTestRunner"
)

/**
 * @since 1.0.0
 * @category Runtime
 */
export const defaultRuntimes = {
  node: (version?: string): MultiRuntimeTestRunner.RuntimeConfig => ({
    name: "node",
    version,
    command: "node",
    args: ["--test"],
    timeout: Duration.toMillis(Duration.minutes(5))
  }),
  bun: {
    name: "bun",
    command: "bun",
    args: ["test"],
    timeout: Duration.toMillis(Duration.minutes(5))
  } as MultiRuntimeTestRunner.RuntimeConfig,
  browser: {
    name: "browser",
    command: "node",
    args: ["--experimental-modules", "-e", "require('./scripts/browser-test-runner.js')"],
    timeout: Duration.toMillis(Duration.minutes(10))
  } as MultiRuntimeTestRunner.RuntimeConfig
}

/**
 * Execute tests in a single runtime.
 * 
 * @since 1.0.0
 * @category Internal
 */
const runTestsInRuntime = (
  testPattern: string,
  runtime: MultiRuntimeTestRunner.RuntimeConfig
): Effect.Effect<MultiRuntimeTestRunner.RuntimeResult, MultiRuntimeTestRunnerError> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    
    try {
      // Execute the test command for this runtime
      const command = [runtime.command, ...runtime.args, testPattern]
      const process = yield* Effect.promise(() =>
        import("child_process").then(cp => 
          new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
            const proc = cp.spawn(runtime.command, [...runtime.args, testPattern], {
              stdio: ['inherit', 'pipe', 'pipe'],
              env: { ...process.env, ...runtime.env },
              timeout: runtime.timeout
            })

            let stdout = ''
            let stderr = ''

            proc.stdout?.on('data', (data) => {
              stdout += data.toString()
            })

            proc.stderr?.on('data', (data) => {
              stderr += data.toString()
            })

            proc.on('close', (code) => {
              resolve({ stdout, stderr, code: code ?? 1 })
            })

            proc.on('error', () => {
              resolve({ stdout, stderr, code: 1 })
            })
          })
        )
      )

      const duration = Date.now() - startTime
      const output = process.stdout + process.stderr

      // Parse test results from output (basic implementation)
      const testResults = parseTestOutput(output, runtime.name)

      return {
        runtime,
        success: process.code === 0,
        output,
        duration,
        testResults
      } satisfies MultiRuntimeTestRunner.RuntimeResult
    } catch (error) {
      return yield* new MultiRuntimeTestRunnerError({
        message: `Failed to run tests in ${runtime.name}${runtime.version ? ` v${runtime.version}` : ''}`,
        runtime,
        cause: error
      })
    }
  })

/**
 * Parse test output to extract test results.
 * This is a basic implementation that can be extended for specific test runners.
 * 
 * @since 1.0.0
 * @category Internal
 */
const parseTestOutput = (output: string, runtimeName: string) => {
  // Basic parsing for common test output patterns
  const passedMatch = output.match(/(\d+)\s+passed/i)
  const failedMatch = output.match(/(\d+)\s+failed/i)
  const totalMatch = output.match(/(\d+)\s+total/i)

  const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0
  const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed

  return passed + failed > 0 ? { passed, failed, total } : undefined
}

/**
 * @since 1.0.0
 * @category Service
 */
const multiRuntimeTestRunnerLive: MultiRuntimeTestRunner.MultiRuntimeTestRunner = {
  runTests: (testPattern, runtimes) =>
    Effect.gen(function* () {
      const results: MultiRuntimeTestRunner.RuntimeResult[] = []
      
      for (const runtime of runtimes) {
        const result = yield* runTestsInRuntime(testPattern, runtime)
        results.push(result)
        
        // Fail fast if any runtime fails
        if (!result.success) {
          yield* Effect.logError(`Tests failed in ${runtime.name}${runtime.version ? ` v${runtime.version}` : ''}`)
        }
      }
      
      return results
    }),

  runTestsParallel: (testPattern, runtimes) =>
    Effect.gen(function* () {
      const results = yield* Effect.all(
        runtimes.map(runtime => runTestsInRuntime(testPattern, runtime)),
        { concurrency: "unbounded" }
      )
      
      return results
    })
}

/**
 * @since 1.0.0
 * @category Layer
 */
export const MultiRuntimeTestRunnerLive: Layer.Layer<MultiRuntimeTestRunner.MultiRuntimeTestRunner> = 
  Layer.succeed(MultiRuntimeTestRunner, multiRuntimeTestRunnerLive)

/**
 * @since 1.0.0
 * @category Utilities
 */
export const runMultiRuntimeTests = (
  testPattern: string,
  runtimes: ReadonlyArray<MultiRuntimeTestRunner.RuntimeConfig>
) =>
  Effect.gen(function* () {
    const runner = yield* MultiRuntimeTestRunner
    return yield* runner.runTests(testPattern, runtimes)
  })

/**
 * @since 1.0.0
 * @category Utilities
 */
export const runMultiRuntimeTestsParallel = (
  testPattern: string,
  runtimes: ReadonlyArray<MultiRuntimeTestRunner.RuntimeConfig>
) =>
  Effect.gen(function* () {
    const runner = yield* MultiRuntimeTestRunner
    return yield* runner.runTestsParallel(testPattern, runtimes)
  })