#!/usr/bin/env node --import tsx/esm
/**
 * Debug Step-Through Demo
 *
 * Launches broken-app.ts with --inspect-brk, connects via @effect-native/debug,
 * and steps through every line of execution, logging file:line:function info.
 *
 * Run with: pnpm test:debug-log-steps
 */

import * as NodeSocket from "@effect/platform-node/NodeSocket"
import { spawn } from "child_process"
import * as Console from "effect/Console"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../src/Debug.js"

// ============================================================================
// Launch Target with Inspector
// ============================================================================

function launchDebugTarget() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const targetScript = join(__dirname, "broken-app.ts")
  const port = 9300 + Math.floor(Math.random() * 100)

  console.log(`🚀 Launching: node --inspect-brk=${port} ${targetScript}`)

  const child = spawn("node", ["--inspect-brk=" + port, "--import", "tsx/esm", targetScript], {
    stdio: ["ignore", "pipe", "pipe"]
  })

  child.stdout.on("data", (data) => process.stdout.write(`[target] ${data}`))
  child.stderr.on("data", (data) => process.stderr.write(`[target] ${data}`))

  return { port, process: child }
}

async function getWebSocketUrl(port: number): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = (await response.json()) as Array<{ webSocketDebuggerUrl: string }>
      if (targets.length > 0) return targets[0].webSocketDebuggerUrl
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  throw new Error("Failed to get WebSocket URL")
}

// ============================================================================
// Main Program
// ============================================================================

const program = Effect.gen(function*() {
  yield* Console.log("🔍 Debug Step-Through Demo")
  yield* Console.log("━".repeat(80))

  // Launch target
  const { port, process: targetProcess } = launchDebugTarget()
  const wsUrl = yield* Effect.promise(() => getWebSocketUrl(port))
  yield* Console.log(`🔌 Connected to ${wsUrl}\n`)

  // Connect debug service
  const debug = yield* Debug
  const session = yield* debug.connect({ endpoint: wsUrl, transport: DebugTransport.cdp() })

  // Track state
  const scripts = yield* Ref.make(new Map<string, { url: string; source?: string }>())
  const stepCount = yield* Ref.make(0)

  // Subscribe to events FIRST
  const events = yield* debug.subscribe(session)

  // Handle events in background
  yield* Effect.forkScoped(
    Stream.runForEach(events, (event) =>
      Effect.gen(function*() {
        // Collect script sources
        if (event.method === "Debugger.scriptParsed") {
          const params = event.params as any
          const scriptId = params.scriptId
          const url = params.url || ""
          yield* Ref.update(scripts, (map) => map.set(scriptId, { url }))
        }

        // Handle paused - log and step
        if (event.method === "Debugger.paused") {
          const params = event.params as any
          const callFrames = params.callFrames || []

          if (callFrames.length > 0) {
            const frame = callFrames[0]
            const loc = frame.location
            const scriptMap = yield* Ref.get(scripts)
            const script = scriptMap.get(loc.scriptId)
            const step = yield* Ref.getAndUpdate(stepCount, (n) => n + 1)

            // Only log our broken-app, not node internals
            if (script?.url.includes("broken-app")) {
              const fileName = script.url.split("/").pop() || "???"
              const funcName = frame.functionName || "(anonymous)"
              yield* Console.log(
                `[${step}] ${fileName}:${loc.lineNumber}:${loc.columnNumber || 0} in ${funcName}`
              )
            }

            // Step into next line (don't wait for response)
            const StepInto = debugCommand({
              transport: DebugTransport.cdp(),
              command: "Debugger.stepInto",
              response: Schema.Struct({})
            })
            yield* Effect.fork(debug.sendCommand(session, StepInto))
          }
        }
      }).pipe(Effect.catchAll(() => Effect.void)))
  )

  // Enable debugger
  yield* Console.log("🔧 Enabling Debugger...")
  const EnableDebugger = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.enable",
    response: Schema.Struct({ debuggerId: Schema.String })
  })
  yield* debug.sendCommand(session, EnableDebugger)
  yield* Console.log("✅ Debugger enabled")

  // Call Runtime.runIfWaitingForDebugger to unpause from --inspect-brk
  yield* Console.log("▶️  Starting execution from --inspect-brk...")
  const RunIfWaiting = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Runtime.runIfWaitingForDebugger",
    response: Schema.Struct({})
  })
  yield* debug.sendCommand(session, RunIfWaiting)

  // Now pause again to start stepping
  yield* Console.log("⏸️  Pausing to start stepping...")
  const Pause = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.pause",
    response: Schema.Struct({})
  })
  yield* debug.sendCommand(session, Pause)

  // Wait for paused event
  yield* Effect.sleep(Duration.millis(100))

  yield* Console.log("🔁 Stepping through code (Ctrl+C to stop)...")
  yield* Console.log("━".repeat(80))
  yield* Console.log("")

  // Wait forever while stepping
  yield* Effect.never
})

// ============================================================================
// Run
// ============================================================================

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor)
)

Effect.runPromise(runnable).catch((error) => {
  console.error("❌ Fatal error:", error)
  process.exit(1)
})
