#!/usr/bin/env node --import tsx/esm
/**
 * Debug Step-Through Demo
 *
 * This script demonstrates using @effect-native/debug to:
 * 1. Launch a Node.js process with debugging enabled
 * 2. Connect to the inspector
 * 3. Enable the Debugger domain
 * 4. Pause execution
 * 5. Step through code line-by-line forever
 * 6. Log execution details (file, line, function, call stack)
 *
 * Run with: pnpm test:debug-log-steps
 */

import * as NodeSocket from "@effect/platform-node/NodeSocket"
import { spawn } from "child_process"
import * as Console from "effect/Console"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../src/Debug.js"

// ============================================================================
// Schemas for CDP Protocol Responses
// ============================================================================

const DebuggerEnableResponse = Schema.Struct({
  debuggerId: Schema.String
})

const DebuggerPauseResponse = Schema.Struct({})

const Location = Schema.Struct({
  scriptId: Schema.String,
  lineNumber: Schema.Number,
  columnNumber: Schema.optional(Schema.Number)
})

const Scope = Schema.Struct({
  type: Schema.String,
  object: Schema.Struct({
    type: Schema.String,
    className: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String)
  })
})

const CallFrame = Schema.Struct({
  callFrameId: Schema.String,
  functionName: Schema.String,
  location: Location,
  url: Schema.String,
  scopeChain: Schema.Array(Scope)
})

const DebuggerStepIntoResponse = Schema.Struct({})

const ScriptParsedParams = Schema.Struct({
  scriptId: Schema.String,
  url: Schema.String,
  startLine: Schema.optional(Schema.Number),
  startColumn: Schema.optional(Schema.Number),
  endLine: Schema.optional(Schema.Number),
  endColumn: Schema.optional(Schema.Number)
})

// ============================================================================
// Launch Target Process
// ============================================================================

function launchDebugTarget(): { port: number; process: ReturnType<typeof spawn> } {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const targetScript = join(__dirname, "broken-app.ts")

  const port = 9300 + Math.floor(Math.random() * 100)
  console.log(`🚀 Launching target process: node --inspect-brk=${port} ${targetScript}`)

  const child = spawn(
    "node",
    ["--inspect-brk=" + port, "--import", "tsx/esm", targetScript],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  )

  child.stdout.on("data", (data) => {
    process.stdout.write(`[target] ${data}`)
  })

  child.stderr.on("data", (data) => {
    process.stderr.write(`[target] ${data}`)
  })

  return { port, process: child }
}

async function getWebSocketUrl(port: number): Promise<string> {
  // Wait for inspector to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000))

  let retries = 5
  while (retries > 0) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = (await response.json()) as Array<{ webSocketDebuggerUrl: string }>

      if (targets.length === 0) {
        throw new Error("No debug targets found")
      }

      return targets[0].webSocketDebuggerUrl
    } catch (error) {
      retries--
      if (retries === 0) throw error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  throw new Error("Failed to get WebSocket URL")
}

// ============================================================================
// Main Debug Step-Through Program
// ============================================================================

const program = Effect.gen(function*() {
  yield* Console.log("🔍 Debug Step-Through Demo")
  yield* Console.log("━".repeat(80))
  yield* Console.log("")

  // Launch target process
  const { port, process: targetProcess } = launchDebugTarget()

  // Get WebSocket URL
  const wsUrl = yield* Effect.promise(() => getWebSocketUrl(port))
  yield* Console.log(`🔌 Inspector WebSocket: ${wsUrl}`)
  yield* Console.log("")

  // Connect to inspector
  const debug = yield* Debug
  const session = yield* debug.connect({
    endpoint: wsUrl,
    transport: DebugTransport.cdp()
  })

  yield* Console.log("✅ Connected to inspector")
  yield* Console.log("")

  // Track parsed scripts
  const scripts = yield* Ref.make(new Map<string, { url: string; scriptId: string }>())

  // Subscribe to debugger events
  const events = yield* debug.subscribe(session)

  // Process events in background
  yield* Effect.forkScoped(
    Stream.runForEach(events, (event) =>
      Effect.gen(function*() {
        // Debug: Log all events
        yield* Console.log(`📬 Event received: ${event.method}`)

        // Log script parsing
        if (event.method === "Debugger.scriptParsed") {
          const parsed = yield* Schema.decodeUnknown(ScriptParsedParams)(event.params)
          yield* Ref.update(scripts, (map) =>
            map.set(parsed.scriptId, {
              url: parsed.url,
              scriptId: parsed.scriptId
            }))

          if (parsed.url.includes("broken-app")) {
            yield* Console.log(`📜 Script parsed: ${parsed.url}`)
          }
        }

        // Handle paused event
        if (event.method === "Debugger.paused") {
          yield* Console.log("🔔 Paused event received!")
          const params = event.params as any
          const callFrames = params.callFrames || []
          const reason = params.reason || "unknown"

          yield* Console.log(`   Call frames: ${callFrames.length}`)

          if (callFrames.length > 0) {
            const frame = callFrames[0]
            const location = frame.location
            const scriptMap = yield* Ref.get(scripts)
            const script = scriptMap.get(location.scriptId)

            yield* Console.log("⏸️  Paused")
            yield* Console.log(`   Reason: ${reason}`)
            yield* Console.log(
              `   Location: ${script?.url || location.scriptId}:${location.lineNumber}:${location.columnNumber || 0}`
            )
            yield* Console.log(`   Function: ${frame.functionName || "(anonymous)"}`)

            // Show call stack
            if (callFrames.length > 1) {
              const stack = callFrames
                .slice(0, 3)
                .map((f: any) => f.functionName || "(anonymous)")
                .join(" → ")
              yield* Console.log(`   Stack: ${stack}`)
            }

            // Step into next line
            const DebuggerStepInto = debugCommand({
              transport: DebugTransport.cdp(),
              command: "Debugger.stepInto",
              response: DebuggerStepIntoResponse
            })
            yield* debug.sendCommand(session, DebuggerStepInto)
          }
        }

        // Handle resumed event
        if (event.method === "Debugger.resumed") {
          yield* Console.log("▶️  Resumed")
        }
      }).pipe(Effect.catchAll((error) => Console.error(`Event error: ${error}`))))
  )

  // Enable debugger
  yield* Console.log("🔧 Enabling Debugger...")
  const DebuggerEnable = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.enable",
    response: DebuggerEnableResponse
  })
  yield* debug.sendCommand(session, DebuggerEnable)

  yield* Console.log("✅ Debugger enabled")
  yield* Console.log("")

  // Explicitly pause execution now that debugger is enabled
  yield* Console.log("⏸️  Pausing execution...")
  const DebuggerPause = debugCommand({
    transport: DebugTransport.cdp(),
    command: "Debugger.pause",
    response: Schema.Struct({})
  })
  yield* debug.sendCommand(session, DebuggerPause)

  // Wait for paused event to be received and processed
  yield* Effect.sleep(Duration.millis(500))

  yield* Console.log("🔁 Stepping through code forever...")
  yield* Console.log("   Press Ctrl+C to stop")
  yield* Console.log("━".repeat(80))
  yield* Console.log("")

  // Keep program alive while events are processed
  // The event handler will receive Debugger.paused and start stepping
  yield* Effect.never

  // Cleanup (won't reach here due to infinite sleep, but good practice)
  yield* debug.disconnect(session)
  targetProcess.kill()
})

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor)
)

// ============================================================================
// Run
// ============================================================================

Effect.runPromise(runnable).catch((error) => {
  console.error("❌ Fatal error:", error)
  process.exit(1)
})
