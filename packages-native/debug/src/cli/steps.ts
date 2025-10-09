#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import type { ChildProcess } from "child_process"
import { spawn } from "child_process"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { existsSync } from "fs"
import { resolve } from "path"
import { pathToFileURL } from "url"
import { command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../Debug.js"

interface SpawnedTarget {
  readonly port: number
  readonly process: ChildProcess
  readonly filePath: string
  readonly fileUrl: string
}

const launchTarget = (filePath: string, port: number): SpawnedTarget => {
  const fileUrl = pathToFileURL(filePath).href

  console.log(`🚀 Launching: node --inspect-brk=${port} ${filePath}`)

  const child = spawn("node", ["--inspect-brk=" + port, filePath], {
    stdio: ["ignore", "pipe", "pipe"]
  })

  child.stdout.on("data", (chunk) => process.stdout.write(`[target] ${chunk}`))
  child.stderr.on("data", (chunk) => process.stderr.write(`[target] ${chunk}`))

  return { port, process: child, filePath, fileUrl }
}

const fetchWebSocketUrl = async (port: number): Promise<string> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = (await response.json()) as Array<{ webSocketDebuggerUrl: string }>
      if (targets.length > 0) {
        return targets[0].webSocketDebuggerUrl
      }
    } catch {
      // ignore, retry after delay
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Unable to discover inspector endpoint on port ${port}`)
}

const createProgram = (filePath: string, maxSteps: number, port: number) =>
  Effect.gen(function*() {
    yield* Console.log("🔍 Debug Step-Through")
    yield* Console.log("━".repeat(80))

    const target = launchTarget(filePath, port)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        target.process.kill("SIGKILL")
      })
    )

    const wsUrl = yield* Effect.promise(() => fetchWebSocketUrl(target.port))
    yield* Console.log(`🔌 Connected to ${wsUrl}`)

    const debug = yield* Debug
    const session = yield* debug.connect({
      endpoint: wsUrl,
      transport: DebugTransport.cdp()
    })

    const scriptSources = yield* Ref.make(new Map<string, { url: string; source?: string }>())
    const stepCountRef = yield* Ref.make(0)

    const GetScriptSource = (scriptId: string) =>
      debugCommand({
        transport: DebugTransport.cdp(),
        command: "Debugger.getScriptSource",
        params: { scriptId },
        response: Schema.Struct({ scriptSource: Schema.String })
      })

    const StepOver = debugCommand({
      transport: DebugTransport.cdp(),
      command: "Debugger.stepOver",
      response: Schema.Struct({})
    })

    const Resume = debugCommand({
      transport: DebugTransport.cdp(),
      command: "Debugger.resume",
      response: Schema.Struct({})
    })

    const events = yield* debug.subscribe(session)
    yield* Effect.forkScoped(
      Stream.runForEach(events, (event) =>
        Effect.gen(function*() {
          if (event.method === "Debugger.scriptParsed") {
            const params = event.params as any
            const scriptId: string = params.scriptId
            const url: string = params.url ?? ""
            yield* Ref.update(scriptSources, (map) => {
              const previous = map.get(scriptId)
              const entry: { url: string; source?: string } = { url }
              if (previous?.source !== undefined) {
                entry.source = previous.source
              }
              map.set(scriptId, entry)
              return map
            })
            if (url === target.fileUrl) {
              const sourceResponse = yield* debug.sendCommand(session, GetScriptSource(scriptId))
              yield* Ref.update(scriptSources, (map) => {
                map.set(scriptId, { url, source: sourceResponse.scriptSource })
                return map
              })
            }
            return
          }

          if (event.method === "Debugger.paused") {
            const params = event.params as any
            const callFrames: Array<any> = params.callFrames ?? []
            if (callFrames.length === 0) {
              yield* debug.sendCommand(session, Resume)
              return
            }

            const frame = callFrames[0]
            const location = frame.location as { scriptId: string; lineNumber: number; columnNumber?: number }
            const scripts = yield* Ref.get(scriptSources)
            const entry = scripts.get(location.scriptId)

            if (!entry) {
              yield* debug.sendCommand(session, Resume)
              return
            }

            let sourceEntry = entry
            if (sourceEntry.url === target.fileUrl && sourceEntry.source === undefined) {
              const sourceResponse = yield* debug.sendCommand(session, GetScriptSource(location.scriptId))
              sourceEntry = { url: sourceEntry.url, source: sourceResponse.scriptSource }
              yield* Ref.update(scriptSources, (map) => {
                map.set(location.scriptId, sourceEntry)
                return map
              })
            }

            if (sourceEntry.url === target.fileUrl && sourceEntry.source) {
              const lines = sourceEntry.source.split(/\r?\n/)
              const zeroBasedLine = location.lineNumber ?? 0
              const lineText = lines[zeroBasedLine] ?? ""
              const column = location.columnNumber ?? 0
              const nextStep = (yield* Ref.get(stepCountRef)) + 1
              yield* Ref.set(stepCountRef, nextStep)
              const displayLine = zeroBasedLine + 1
              const functionName = frame.functionName && frame.functionName.length > 0
                ? frame.functionName
                : "(anonymous)"
              const shortPath = target.filePath.split("/").pop() ?? target.filePath

              yield* Console.log(
                `[${nextStep.toString().padStart(4, " ")}] ${shortPath}:${displayLine}:${column} ${functionName}`
              )
              yield* Console.log(`      > ${lineText.trimEnd()}`)

              if (nextStep >= maxSteps) {
                yield* Console.log(`🏁 Reached maximum step count (${maxSteps}). Exiting debugger session.`)
                yield* debug.sendCommand(session, Resume)
                yield* debug.disconnect(session)
                yield* Effect.sync(() => target.process.kill("SIGKILL"))
                yield* Console.log("✅ Finished stepping session")
                yield* Effect.sync(() => process.exit(0))
              } else {
                yield* Effect.fork(debug.sendCommand(session, StepOver))
              }
              return
            }

            yield* debug.sendCommand(session, Resume)
            return
          }

          if (event.method === "Debugger.resumed") {
            return
          }
        }).pipe(
          Effect.catchAll((error) =>
            Console.error(`❌ Event handler error: ${error instanceof Error ? error.message : String(error)}`)
          )
        ))
    )

    const EnableDebugger = debugCommand({
      transport: DebugTransport.cdp(),
      command: "Debugger.enable",
      response: Schema.Struct({ debuggerId: Schema.String })
    })
    yield* debug.sendCommand(session, EnableDebugger)
    yield* Console.log("✅ Debugger enabled")

    const RunIfWaiting = debugCommand({
      transport: DebugTransport.cdp(),
      command: "Runtime.runIfWaitingForDebugger",
      response: Schema.Struct({})
    })
    yield* debug.sendCommand(session, RunIfWaiting)
    yield* Console.log("▶️  Runtime.runIfWaitingForDebugger invoked")

    const Pause = debugCommand({
      transport: DebugTransport.cdp(),
      command: "Debugger.pause",
      response: Schema.Struct({})
    })
    yield* debug.sendCommand(session, Pause)
    yield* Console.log("⏸️  Initial pause requested")

    yield* Console.log("🔁 Stepping through code (Ctrl+C to stop)...")
    yield* Console.log("━".repeat(80))

    yield* Effect.never
  })

// Define CLI arguments and options
const fileArg = Args.text({ name: "file" }).pipe(
  Args.withDescription("Path to the JavaScript or TypeScript file to debug")
)

const maxStepsOption = Options.integer("max-steps").pipe(
  Options.withDescription("Maximum number of steps to execute"),
  Options.withDefault(200)
)

const portOption = Options.integer("port").pipe(
  Options.withDescription("Inspector port to use (random 9300-9399 by default)"),
  Options.withDefault(9300 + Math.floor(Math.random() * 100))
)

// Create the command
const stepsCommand = Command.make(
  "steps",
  { file: fileArg, maxSteps: maxStepsOption, port: portOption },
  ({ file, maxSteps, port }) =>
    Effect.gen(function*() {
      const filePath = resolve(file)
      if (!existsSync(filePath)) {
        return yield* Effect.fail(new Error(`File not found: ${filePath}`))
      }
      return yield* Effect.scoped(createProgram(filePath, maxSteps, port))
    }).pipe(
      Effect.provide(layerCdp),
      Effect.provide(NodeSocket.layerWebSocketConstructor),
      Effect.provide(NodeContext.layer)
    )
).pipe(
  Command.withDescription("Step through a Node.js script line-by-line using the debugger protocol")
)

// Run the CLI
const cli = Command.run(stepsCommand, {
  name: "Debug Steps",
  version: "0.0.0"
})

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
