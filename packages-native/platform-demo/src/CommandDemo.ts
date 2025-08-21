/**
 * @since 0.0.1
 */
import * as Command from "@effect/platform/Command"
import * as Chunk from "effect/Chunk"
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
 *
 * Effect.provide(
 *   CommandDemo.basicExecution,
 *   NodeCommandExecutor.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicExecution = Effect.gen(function*() {
  yield* logSection("Command Basic Execution")

  yield* logDemo("Simple Command", "Running echo command")
  const echoCmd = Command.make("echo", "Hello from Effect Platform!")
  const echoOutput = yield* Command.string(echoCmd)
  const echoExitCode = yield* Command.exitCode(echoCmd)
  yield* logResult("Output", echoOutput)
  yield* logResult("Exit code", echoExitCode)

  yield* logDemo("Command with Args", "Multiple arguments")
  const lsCmd = Command.make("ls", "-la", "-h")
  const lsOutput = yield* Command.string(lsCmd)
  yield* logResult("Files listed", lsOutput.split("\n").length - 1)

  yield* logDemo("Command Pipeline", "Piping commands")
  const pipeline = Command.make("echo", "Line 1\nLine 2\nLine 3").pipe(
    Command.pipeTo(Command.make("grep", "2"))
  )
  const pipeOutput = yield* Command.string(pipeline)
  yield* logResult("Filtered output", pipeOutput.trim())

  return { echoOutput, lsOutput: lsOutput.split("\n").length - 1, pipeOutput }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingOutput = Effect.gen(function*() {
  yield* logSection("Streaming Command Output")

  yield* logDemo("Stream Lines", "Processing output line by line")
  const cmd = Command.make("echo", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5")

  const lines = yield* Command.stream(cmd).pipe(
    Stream.decodeText(),
    Stream.splitLines,
    Stream.map((line) => `Processed: ${line}`),
    Stream.runCollect
  )

  yield* logResult("Processed lines", lines.length)

  yield* logDemo("Real-time Stream", "Live output processing")
  const countCmd = Command.make("sh", "-c", "for i in 1 2 3; do echo Count: $i; sleep 0.1; done")

  yield* Command.stream(countCmd).pipe(
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
export const environmentVariables = Effect.gen(function*() {
  yield* logSection("Environment Variables")

  yield* logDemo("Set Environment", "Custom environment variables")
  const cmdWithEnv = Command.make("sh", "-c", "echo $CUSTOM_VAR").pipe(
    Command.env({ CUSTOM_VAR: "Effect Platform Demo" })
  )

  const envOutput = yield* Command.string(cmdWithEnv)
  yield* logResult("Custom var", envOutput.trim())

  yield* logDemo("Inherit Environment", "Using existing env")
  const inheritCmd = Command.make("sh", "-c", "echo PATH: $PATH | head -c 50")
  const inheritOutput = yield* Command.string(inheritCmd)
  yield* logResult("PATH (truncated)", inheritOutput.trim() + "...")

  yield* logDemo("Clear Environment", "Isolated environment")
  const clearCmd = Command.make("sh", "-c", "echo HOME: $HOME").pipe(
    Command.env({}), // Clear environment by setting empty env
    Command.env({ HOME: "/custom/home" })
  )

  const clearOutput = yield* Command.string(clearCmd)
  yield* logResult("Custom HOME", clearOutput.trim())

  return { environment: "configured" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const workingDirectory = Effect.gen(function*() {
  yield* logSection("Working Directory")

  yield* logDemo("Current Directory", "Default working directory")
  const pwdCmd = Command.make("pwd")
  const pwdOutput = yield* Command.string(pwdCmd)
  yield* logResult("Current dir", pwdOutput.trim())

  yield* logDemo("Change Directory", "Custom working directory")
  const cmdInTemp = Command.make("pwd").pipe(
    Command.workingDirectory("/tmp")
  )

  const tempOutput = yield* Command.string(cmdInTemp)
  yield* logResult("Working in", tempOutput.trim())

  yield* logDemo("Relative Paths", "Commands with relative paths")
  const relativeCmd = Command.make("ls", ".").pipe(
    Command.workingDirectory("/")
  )

  const relativeOutput = yield* Command.string(relativeCmd)
  const fileCount = relativeOutput.split("\n").length - 1
  yield* logResult("Root files", `${fileCount} items`)

  return { directory: "managed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const standardStreams = Effect.gen(function*() {
  yield* logSection("Standard Streams")

  yield* logDemo("Stdin Input", "Providing input to command")
  const catCmd = Command.make("cat").pipe(
    Command.feed("Input line 1\nInput line 2\nInput line 3\n")
  )

  const stdinOutput = yield* Command.string(catCmd)
  yield* logResult("Received via stdin", stdinOutput)

  yield* logDemo("Stderr Output", "Capturing error stream")
  const stderrCmd = Command.make("sh", "-c", "echo 'Normal output'; echo 'Error output' >&2")
  // For stderr, we need to use the Process API with Scope
  yield* Effect.scoped(Effect.gen(function*() {
    const stderrProcess = yield* Command.start(stderrCmd)
    const stdout = yield* stderrProcess.stdout.pipe(
      Stream.decodeText(),
      Stream.runCollect,
      Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
    )
    const stderr = yield* stderrProcess.stderr.pipe(
      Stream.decodeText(),
      Stream.runCollect,
      Effect.map((chunks) => Chunk.toReadonlyArray(chunks).join(""))
    )
    yield* stderrProcess.exitCode
    yield* logResult("Stdout", stdout.trim())
    yield* logResult("Stderr", stderr.trim())
  }))

  yield* logDemo("Redirect Streams", "Output redirection")
  const redirectCmd = Command.make("sh", "-c", "echo 'Data' > /tmp/effect-demo.txt && cat /tmp/effect-demo.txt")
  const redirectOutput = yield* Command.string(redirectCmd)
  yield* logResult("Redirected content", redirectOutput.trim())

  return { streams: "handled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function*() {
  yield* logSection("Command Error Handling")

  yield* logDemo("Non-zero Exit", "Handling command failure")
  const failCmd = Command.make("sh", "-c", "exit 1")
  const failResult = yield* Command.string(failCmd).pipe(Effect.either)

  yield* logResult("Exit code", failResult._tag === "Left" ? "Failed (as expected)" : "Unexpected success")

  yield* logDemo("Command Not Found", "Missing executable")
  const missingCmd = Command.make("nonexistent-command-xyz")
  const missingResult = yield* Command.string(missingCmd).pipe(Effect.either)

  yield* logResult("Command not found", missingResult._tag === "Left" ? "Error caught" : "Unexpected success")

  yield* logDemo("Timeout", "Command timeout")
  const slowCmd = Command.make("sleep", "10")
  const timeoutResult = yield* Command.string(slowCmd).pipe(
    Effect.timeout("1 second"),
    Effect.either
  )

  yield* logResult("Timeout", timeoutResult._tag === "Left" ? "Timed out (as expected)" : "Completed")

  return { errors: "handled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const processControl = Effect.gen(function*() {
  yield* logSection("Process Control")

  yield* logDemo("Exit Code Check", "Validating exit codes")
  const successCmd = Command.make("true")
  const successExitCode = yield* Command.exitCode(successCmd)
  yield* logResult("Success exit code", successExitCode)

  const failureCmd = Command.make("false")
  const failureExitCode = yield* Command.exitCode(failureCmd).pipe(
    Effect.catchAll(() => Effect.succeed(1))
  )
  yield* logResult("Failure exit code", failureExitCode)

  yield* logDemo("Signal Handling", "Process signals")
  const signalCmd = Command.make("sh", "-c", "trap 'echo Caught signal' TERM; sleep 0.1")
  yield* Command.string(signalCmd)
  yield* logResult("Signal test", "Completed normally")

  return { process: "controlled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const complexScripts = Effect.gen(function*() {
  yield* logSection("Complex Scripts")

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
  const scriptOutput = yield* Command.string(scriptCmd)
  yield* logResult("Script output", scriptOutput)

  yield* logDemo("Conditional Logic", "Script with conditions")
  const conditionalScript = `
    if [ -d "/tmp" ]; then
      echo "/tmp exists"
    else
      echo "/tmp does not exist"
    fi
  `
  const conditionalCmd = Command.make("sh", "-c", conditionalScript)
  const conditionalOutput = yield* Command.string(conditionalCmd)
  yield* logResult("Condition result", conditionalOutput.trim())

  return { scripts: "executed" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
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
