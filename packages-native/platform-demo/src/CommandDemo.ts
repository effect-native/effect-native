/**
 * @since 0.0.1
 */
import * as Command from "@effect/platform/Command"
import * as CommandExecutor from "@effect/platform/CommandExecutor"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection, withTiming } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as CommandDemo from "@effect-native/platform-demo/CommandDemo"
 * import * as NodeCommandExecutor from "@effect/platform-node/NodeCommandExecutor"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * 
 * Effect.provide(
 *   CommandDemo.basicExecution,
 *   NodeCommandExecutor.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicExecution = Effect.gen(function* () {
  yield* logSection("Command Basic Execution")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Simple Command", "Running echo command")
  const echoCmd = Command.make("echo", "Hello from Effect Platform!")
  const echoResult = yield* executor.execute(echoCmd)
  yield* logResult("Output", echoResult.stdout)
  yield* logResult("Exit code", echoResult.exitCode)
  
  yield* logDemo("Command with Args", "Multiple arguments")
  const lsCmd = Command.make("ls", "-la", "-h")
  const lsResult = yield* executor.execute(lsCmd)
  yield* logResult("Files listed", lsResult.stdout.split("\n").length - 1)
  
  yield* logDemo("Command Pipeline", "Piping commands")
  const pipeline = Command.make("echo", "Line 1\nLine 2\nLine 3").pipe(
    Command.pipeTo(Command.make("grep", "2"))
  )
  const pipeResult = yield* executor.execute(pipeline)
  yield* logResult("Filtered output", pipeResult.stdout.trim())
  
  return { echoResult, lsResult, pipeResult }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingOutput = Effect.gen(function* () {
  yield* logSection("Streaming Command Output")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Stream Lines", "Processing output line by line")
  const cmd = Command.make("echo", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5")
  
  const lines = yield* executor.stream(cmd).pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.map((line) => `Processed: ${line}`),
    Stream.runCollect
  )
  
  yield* logResult("Processed lines", lines.length)
  
  yield* logDemo("Real-time Stream", "Live output processing")
  const countCmd = Command.make("sh", "-c", "for i in 1 2 3; do echo Count: $i; sleep 0.1; done")
  
  yield* executor.stream(countCmd).pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.tap((line) => Console.log(`📊 ${line}`)),
    Stream.runDrain
  )
  
  yield* logResult("Streaming", "Complete")
  
  return { lines: lines.length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const environmentVariables = Effect.gen(function* () {
  yield* logSection("Environment Variables")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Set Environment", "Custom environment variables")
  const cmdWithEnv = Command.make("sh", "-c", "echo $CUSTOM_VAR").pipe(
    Command.env({ CUSTOM_VAR: "Effect Platform Demo" })
  )
  
  const envResult = yield* executor.execute(cmdWithEnv)
  yield* logResult("Custom var", envResult.stdout.trim())
  
  yield* logDemo("Inherit Environment", "Using existing env")
  const inheritCmd = Command.make("sh", "-c", "echo PATH: $PATH | head -c 50")
  const inheritResult = yield* executor.execute(inheritCmd)
  yield* logResult("PATH (truncated)", inheritResult.stdout.trim() + "...")
  
  yield* logDemo("Clear Environment", "Isolated environment")
  const clearCmd = Command.make("sh", "-c", "echo HOME: $HOME").pipe(
    Command.clearEnv,
    Command.env({ HOME: "/custom/home" })
  )
  
  const clearResult = yield* executor.execute(clearCmd)
  yield* logResult("Custom HOME", clearResult.stdout.trim())
  
  return { environment: "configured" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const workingDirectory = Effect.gen(function* () {
  yield* logSection("Working Directory")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Current Directory", "Default working directory")
  const pwdCmd = Command.make("pwd")
  const pwdResult = yield* executor.execute(pwdCmd)
  yield* logResult("Current dir", pwdResult.stdout.trim())
  
  yield* logDemo("Change Directory", "Custom working directory")
  const cmdInTemp = Command.make("pwd").pipe(
    Command.workingDirectory("/tmp")
  )
  
  const tempResult = yield* executor.execute(cmdInTemp)
  yield* logResult("Working in", tempResult.stdout.trim())
  
  yield* logDemo("Relative Paths", "Commands with relative paths")
  const relativeCmd = Command.make("ls", ".").pipe(
    Command.workingDirectory("/")
  )
  
  const relativeResult = yield* executor.execute(relativeCmd)
  const fileCount = relativeResult.stdout.split("\n").length - 1
  yield* logResult("Root files", `${fileCount} items`)
  
  return { directory: "managed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const standardStreams = Effect.gen(function* () {
  yield* logSection("Standard Streams")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Stdin Input", "Providing input to command")
  const catCmd = Command.make("cat").pipe(
    Command.stdin(Stream.make("Input line 1\n", "Input line 2\n", "Input line 3\n"))
  )
  
  const stdinResult = yield* executor.execute(catCmd)
  yield* logResult("Received via stdin", stdinResult.stdout)
  
  yield* logDemo("Stderr Output", "Capturing error stream")
  const stderrCmd = Command.make("sh", "-c", "echo 'Normal output'; echo 'Error output' >&2")
  const stderrResult = yield* executor.execute(stderrCmd)
  yield* logResult("Stdout", stderrResult.stdout.trim())
  yield* logResult("Stderr", stderrResult.stderr.trim())
  
  yield* logDemo("Redirect Streams", "Output redirection")
  const redirectCmd = Command.make("sh", "-c", "echo 'Data' > /tmp/effect-demo.txt && cat /tmp/effect-demo.txt")
  const redirectResult = yield* executor.execute(redirectCmd)
  yield* logResult("Redirected content", redirectResult.stdout.trim())
  
  return { streams: "handled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function* () {
  yield* logSection("Command Error Handling")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Non-zero Exit", "Handling command failure")
  const failCmd = Command.make("sh", "-c", "exit 1")
  const failResult = yield* executor.execute(failCmd).pipe(Effect.either)
  
  yield* logResult("Exit code", 
    failResult._tag === "Left" ? "Failed (as expected)" : "Unexpected success"
  )
  
  yield* logDemo("Command Not Found", "Missing executable")
  const missingCmd = Command.make("nonexistent-command-xyz")
  const missingResult = yield* executor.execute(missingCmd).pipe(Effect.either)
  
  yield* logResult("Command not found",
    missingResult._tag === "Left" ? "Error caught" : "Unexpected success"
  )
  
  yield* logDemo("Timeout", "Command timeout")
  const slowCmd = Command.make("sleep", "10")
  const timeoutResult = yield* executor.execute(slowCmd).pipe(
    Effect.timeout("1 second"),
    Effect.either
  )
  
  yield* logResult("Timeout",
    timeoutResult._tag === "Left" ? "Timed out (as expected)" : "Completed"
  )
  
  return { errors: "handled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const processControl = Effect.gen(function* () {
  yield* logSection("Process Control")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Exit Code Check", "Validating exit codes")
  const successCmd = Command.make("true")
  const successResult = yield* executor.execute(successCmd)
  yield* logResult("Success exit code", successResult.exitCode)
  
  const failureCmd = Command.make("false")
  const failureResult = yield* executor.execute(failureCmd).pipe(
    Effect.catchAll(() => Effect.succeed({ exitCode: 1 }))
  )
  yield* logResult("Failure exit code", failureResult.exitCode)
  
  yield* logDemo("Signal Handling", "Process signals")
  const signalCmd = Command.make("sh", "-c", "trap 'echo Caught signal' TERM; sleep 0.1")
  const signalResult = yield* executor.execute(signalCmd)
  yield* logResult("Signal test", "Completed normally")
  
  return { process: "controlled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const complexScripts = Effect.gen(function* () {
  yield* logSection("Complex Scripts")
  
  const executor = yield* CommandExecutor.CommandExecutor
  
  yield* logDemo("Multi-line Script", "Running shell script")
  const script = `
    echo "Starting script..."
    COUNT=3
    for i in $(seq 1 $COUNT); do
      echo "Step $i of $COUNT"
    done
    echo "Script complete!"
  `
  const scriptCmd = Command.make("sh", "-c", script)
  const scriptResult = yield* executor.execute(scriptCmd)
  yield* logResult("Script output", scriptResult.stdout)
  
  yield* logDemo("Conditional Logic", "Script with conditions")
  const conditionalScript = `
    if [ -d "/tmp" ]; then
      echo "/tmp exists"
    else
      echo "/tmp does not exist"
    fi
  `
  const conditionalCmd = Command.make("sh", "-c", conditionalScript)
  const conditionalResult = yield* executor.execute(conditionalCmd)
  yield* logResult("Condition result", conditionalResult.stdout.trim())
  
  return { scripts: "executed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function* () {
  yield* withTiming("Basic Execution", basicExecution)
  yield* withTiming("Streaming Output", streamingOutput)
  yield* withTiming("Environment Variables", environmentVariables)
  yield* withTiming("Working Directory", workingDirectory)
  yield* withTiming("Standard Streams", standardStreams)
  yield* withTiming("Error Handling", errorHandling)
  yield* withTiming("Process Control", processControl)
  yield* withTiming("Complex Scripts", complexScripts)
  
  yield* Console.log("\n✨ All Command demos completed!")
})