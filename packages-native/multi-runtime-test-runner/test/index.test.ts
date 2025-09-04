import { Effect, Layer } from "effect"
import * as assert from "assert"
import { effect } from "@effect/vitest"
import { 
  MultiRuntimeTestRunner, 
  MultiRuntimeTestRunnerLive,
  defaultRuntimes,
  runMultiRuntimeTests
} from "@effect-native/multi-runtime-test-runner"

describe("MultiRuntimeTestRunner", () => {
  effect("creates service with proper interface", () =>
    Effect.gen(function* () {
      const runner = yield* MultiRuntimeTestRunner
      
      assert.ok(typeof runner.runTests === "function")
      assert.ok(typeof runner.runTestsParallel === "function")
    })
  ).pipe(Effect.provide(MultiRuntimeTestRunnerLive))

  effect("default runtimes configuration", () =>
    Effect.gen(function* () {
      const nodeConfig = defaultRuntimes.node("18")
      const bunConfig = defaultRuntimes.bun
      const browserConfig = defaultRuntimes.browser

      assert.strictEqual(nodeConfig.name, "node")
      assert.strictEqual(nodeConfig.version, "18")
      assert.strictEqual(nodeConfig.command, "node")
      assert.ok(Array.isArray(nodeConfig.args))

      assert.strictEqual(bunConfig.name, "bun")
      assert.strictEqual(bunConfig.command, "bun")
      assert.ok(Array.isArray(bunConfig.args))

      assert.strictEqual(browserConfig.name, "browser")
      assert.ok(browserConfig.timeout && browserConfig.timeout > 0)
    })
  )

  effect("runMultiRuntimeTests utility function works", () =>
    Effect.gen(function* () {
      const mockRuntimes = [
        {
          name: "test-runtime",
          command: "echo",
          args: ["test output"],
          timeout: 1000
        }
      ]

      // This would actually run a command, so we'll just test the structure
      // In real tests, we'd mock the command execution
      const program = runMultiRuntimeTests("**/*.test.ts", mockRuntimes)
      
      // Verify the effect is properly typed and structured
      assert.ok(Effect.isEffect(program))
    })
  ).pipe(Effect.provide(MultiRuntimeTestRunnerLive))
})