#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli"
import * as PlatformNode from "@effect/platform-node"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import type * as child_process from "child_process"
import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as nodeFs from "fs"
import * as nodePath from "path"
import * as nodeUrl from "url"
import * as Debug from "../Debug.js"

interface SpawnedTarget {
  readonly port: number
  readonly process: child_process.ChildProcess
  readonly filePath: string
  readonly fileUrl: string
}

const GetScriptSource = (scriptId: string) =>
  Debug.cdpCommand({
    command: "Debugger.getScriptSource",
    params: { scriptId },
    response: Schema.Struct({ scriptSource: Schema.String })
  })

const StepOver = Debug.cdpCommand({ command: "Debugger.stepOver", response: Schema.Struct({}) })
const Resume = Debug.cdpCommand({ command: "Debugger.resume", response: Schema.Struct({}) })

const createProgram = Effect.fn(
  function*({ maxSteps, port }: { maxSteps: number; port: number }) {
    //   yield* Console.log("🔍 Debug Step-Through")
    //   yield* Console.log("━".repeat(80))

    //   const target = yield* DebugTarget

    //   yield* Console.log(`🔌 Connected to ${target.wsUrl}`)

    //   const debug = yield* Debug.Debug
    //   const session = yield* debug.connect({ endpoint: target.wsUrl })

    //   const scriptSources = yield* Ref.make(new Map<string, { url: string; source?: string }>())
    //   const stepCountRef = yield* Ref.make(0)

    //   const events = yield* debug.subscribe(session)
    //   yield* Effect.forkScoped(
    //     Stream.runForEach(events, (event) =>
    //       Effect.gen(function*() {
    //         if (event.method === "Debugger.scriptParsed") {
    //           const params = event.params as any
    //           const scriptId: string = params.scriptId
    //           const url: string = params.url ?? ""
    //           yield* Ref.update(scriptSources, (map) => {
    //             const previous = map.get(scriptId)
    //             const entry: { url: string; source?: string } = { url }
    //             if (previous?.source !== undefined) {
    //               entry.source = previous.source
    //             }
    //             map.set(scriptId, entry)
    //             return map
    //           })
    //           if (url === target.fileUrl) {
    //             const sourceResponse = yield* debug.sendCommand(session, yield* GetScriptSource(scriptId))
    //             yield* Ref.update(scriptSources, (map) => {
    //               map.set(scriptId, { url, source: sourceResponse.scriptSource })
    //               return map
    //             })
    //           }
    //           return
    //         }

    //         if (event.method === "Debugger.paused") {
    //           const params = event.params as any
    //           const callFrames: Array<any> = params.callFrames ?? []
    //           if (callFrames.length === 0) {
    //             yield* debug.sendCommand(session, yield* Resume)
    //             return
    //           }

    //           const frame = callFrames[0]
    //           const location = frame.location as { scriptId: string; lineNumber: number; columnNumber?: number }
    //           const scripts = yield* Ref.get(scriptSources)
    //           const entry = scripts.get(location.scriptId)

    //           if (!entry) {
    //             yield* debug.sendCommand(session, yield* Resume)
    //             return
    //           }

    //           let sourceEntry = entry
    //           if (sourceEntry.url === target.fileUrl && sourceEntry.source === undefined) {
    //             const sourceResponse = yield* debug.sendCommand(session, yield* GetScriptSource(location.scriptId))
    //             sourceEntry = { url: sourceEntry.url, source: sourceResponse.scriptSource }
    //             yield* Ref.update(scriptSources, (map) => {
    //               map.set(location.scriptId, sourceEntry)
    //               return map
    //             })
    //           }

    //           if (sourceEntry.url === target.fileUrl && sourceEntry.source) {
    //             const lines = sourceEntry.source.split(/\r?\n/)
    //             const zeroBasedLine = location.lineNumber ?? 0
    //             const lineText = lines[zeroBasedLine] ?? ""
    //             const column = location.columnNumber ?? 0
    //             const nextStep = (yield* Ref.get(stepCountRef)) + 1
    //             yield* Ref.set(stepCountRef, nextStep)
    //             const displayLine = zeroBasedLine + 1
    //             const functionName = frame.functionName && frame.functionName.length > 0
    //               ? frame.functionName
    //               : "(anonymous)"
    //             const shortPath = target.filePath.split("/").pop() ?? target.filePath

    //             yield* Console.log(
    //               `[${nextStep.toString().padStart(4, " ")}] ${shortPath}:${displayLine}:${column} ${functionName}`
    //             )
    //             yield* Console.log(`      > ${lineText.trimEnd()}`)

    //             if (nextStep >= maxSteps) {
    //               yield* Console.log(`🏁 Reached maximum step count (${maxSteps}). Exiting debugger session.`)
    //               yield* debug.sendCommand(session, yield* Resume)
    //               yield* debug.disconnect(session)
    //               yield* target.kill
    //               yield* Console.log("✅ Finished stepping session")
    //               return yield* Effect.sync(() => process.exit(0))
    //             }
    //             yield* Effect.fork(debug.sendCommand(session, yield* StepOver))
    //             return
    //           }

    //           yield* debug.sendCommand(session, yield* Resume)
    //           return
    //         }

    //         if (event.method === "Debugger.resumed") {
    //           return
    //         }
    //       }).pipe(
    //         Effect.catchAll((error) =>
    //           Console.error(`❌ Event handler error: ${error instanceof Error ? error.message : String(error)}`)
    //         )
    //       ))
    //   )

    //   const EnableDebugger = Debug.cdpCommand({
    //     command: "Debugger.enable",
    //     response: Schema.Struct({ debuggerId: Schema.String })
    //   })
    //   yield* debug.sendCommand(session, yield* EnableDebugger)
    //   yield* Console.log("✅ Debugger enabled")

    //   const RunIfWaiting = Debug.cdpCommand({
    //     command: "Runtime.runIfWaitingForDebugger",
    //     response: Schema.Struct({})
    //   })
    //   yield* debug.sendCommand(session, yield* RunIfWaiting)
    //   yield* Console.log("▶️  Runtime.runIfWaitingForDebugger invoked")

    //   const Pause = Debug.cdpCommand({
    //     command: "Debugger.pause",
    //     response: Schema.Struct({})
    //   })
    //   yield* debug.sendCommand(session, yield* Pause)
    //   yield* Console.log("⏸️  Initial pause requested")

    //   yield* Console.log("🔁 Stepping through code (Ctrl+C to stop)...")
    //   yield* Console.log("━".repeat(80))

    //   return yield* Effect.never
  },
  Effect.scoped
)

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
      const path = yield* Path.Path
      const fs = yield* FileSystem.FileSystem
      const filePath = path.resolve(file)
      if (!(yield* fs.exists(filePath))) {
        return yield* Effect.fail(new Error(`File not found: ${filePath}`))
      }
      return yield* createProgram({ maxSteps, port })
    })
).pipe(
  Command.withDescription("Step through a Node.js script line-by-line using the debugger protocol")
)

// Run the CLI
const cli = Command.run(stepsCommand, {
  name: "Debug Steps",
  version: "0.0.0"
})

const layers = Layer.mergeAll(
  Debug.layerCdp.pipe(Layer.provide(NodeSocket.layerWebSocketConstructor)),
  NodeContext.layer
)
Effect.suspend(() => cli(process.argv)).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(layers),
  NodeRuntime.runMain
)
