---
title: Debug TodoMVC POC Script
status: blocked
done_when: node packages-native/debug/poc/debug-todomvc.ts
basis: |
  Blocked by todomvc GOAL in peer repo - need the target application first.
blocked_by:
  - ../todomvc/.tasks/GOAL-effect-atom.md
artifacts:
  - path: packages-native/debug/poc/debug-todomvc.ts
    description: POC demonstrating connect, breakpoint, state read
---

# Impl: Debug TodoMVC POC Script

## Objective

Create a proof-of-concept script that demonstrates the full debugging workflow:

1. Connect to running TodoMVC app
2. Set a breakpoint in application code
3. Read runtime state when paused
4. Resume and disconnect cleanly

## Prerequisites

- TodoMVC app running with `--inspect` or `--inspect-brk`
- Inspector endpoint available (e.g., `ws://127.0.0.1:9229/...`)

## Script: debug-todomvc.ts

```ts
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { command, Debug, layerCdp, Transport } from "../src"

// CDP Commands
const EnableDebugger = command({
  transport: Transport.cdp(),
  command: "Debugger.enable",
  response: Schema.Struct({ debuggerId: Schema.String })
})

const EnableRuntime = command({
  transport: Transport.cdp(),
  command: "Runtime.enable",
  response: Schema.Struct({})
})

const SetBreakpointByUrl = command({
  transport: Transport.cdp(),
  command: "Debugger.setBreakpointByUrl",
  params: {
    lineNumber: 0, // Will be set dynamically
    url: "", // Will be set dynamically
    columnNumber: 0
  },
  response: Schema.Struct({
    breakpointId: Schema.String,
    locations: Schema.Array(Schema.Any)
  })
})

const EvaluateOnCallFrame = command({
  transport: Transport.cdp(),
  command: "Debugger.evaluateOnCallFrame",
  params: {
    callFrameId: "", // Will be set dynamically
    expression: "", // Will be set dynamically
    returnByValue: true
  },
  response: Schema.Struct({
    result: Schema.Struct({
      type: Schema.String,
      value: Schema.optional(Schema.Unknown)
    })
  })
})

const Resume = command({
  transport: Transport.cdp(),
  command: "Debugger.resume",
  response: Schema.Struct({})
})

const program = Effect.gen(function*() {
  const debug = yield* Debug

  // 1. Discover WebSocket URL from inspector endpoint
  yield* Console.log("Discovering inspector endpoint...")

  // For POC, assume URL is passed as arg or use default
  const wsUrl = process.argv[2] || "ws://127.0.0.1:9229"

  yield* Console.log(`Connecting to ${wsUrl}...`)

  // 2. Connect to the inspector
  const session = yield* debug.connect({
    endpoint: wsUrl,
    transport: Transport.cdp()
  })

  yield* Console.log("Connected!")

  // 3. Enable debugger and runtime
  yield* debug.sendCommand(session, EnableDebugger)
  yield* debug.sendCommand(session, EnableRuntime)
  yield* Console.log("Debugger and Runtime enabled")

  // 4. Subscribe to events
  const events = yield* debug.subscribe(session)

  // 5. Set breakpoint in addTodo function
  // (Actual URL will depend on where TodoMVC is served from)
  yield* Console.log("Setting breakpoint in addTodo handler...")

  const breakpoint = yield* debug.sendCommand(session, {
    ...SetBreakpointByUrl,
    params: {
      lineNumber: 10, // Adjust based on actual source
      url: "http://localhost:5173/src/atoms/todos.ts",
      columnNumber: 0
    }
  })

  yield* Console.log(`Breakpoint set: ${breakpoint.breakpointId}`)
  yield* Console.log("Waiting for breakpoint hit...")
  yield* Console.log("(Add a todo in the app to trigger the breakpoint)")

  // 6. Wait for paused event and read state
  yield* Stream.runForEach(events, (event) =>
    Effect.gen(function*() {
      if (event.method === "Debugger.paused") {
        const params = event.params as any
        const callFrames = params.callFrames || []
        const frame = callFrames[0]

        if (!frame) return

        yield* Console.log("\n=== Breakpoint Hit! ===")
        yield* Console.log(`Location: ${frame.url}:${frame.location.lineNumber}`)
        yield* Console.log(`Function: ${frame.functionName || "(anonymous)"}`)

        // 7. Read local variables
        yield* Console.log("\n--- Local Variables ---")

        // Get scope variables
        for (const scope of frame.scopeChain || []) {
          if (scope.type === "local") {
            yield* Console.log(`Scope: ${scope.type}`)
            // Would need Runtime.getProperties to expand the object
          }
        }

        // 8. Evaluate expression to read atom state
        yield* Console.log("\n--- Reading Application State ---")

        try {
          // Try to read the todos from effect-atom state
          // This depends on how atoms are exposed
          const result = yield* debug.sendCommand(session, {
            ...EvaluateOnCallFrame,
            params: {
              callFrameId: frame.callFrameId,
              expression: "JSON.stringify(this)",
              returnByValue: true
            }
          })

          yield* Console.log(`this: ${JSON.stringify(result.result.value)}`)
        } catch (e) {
          yield* Console.log("Could not evaluate 'this'")
        }

        // 9. Resume execution
        yield* Console.log("\nResuming execution...")
        yield* debug.sendCommand(session, Resume)

        // Exit after first breakpoint for POC
        yield* Console.log("\nPOC complete! Disconnecting...")
        yield* debug.disconnect(session)
        yield* Effect.interrupt
      }
    }))
})

const runnable = Effect.scoped(program).pipe(
  Effect.provide(layerCdp),
  Effect.provide(NodeSocket.layerWebSocketConstructor),
  Effect.catchAll((e) => Console.error(`Error: ${e}`))
)

Effect.runPromise(runnable).catch(console.error)
```

## Usage

```bash
# Terminal 1: Start TodoMVC with inspector
cd todomvc
node --inspect-brk=9229 node_modules/.bin/vite

# Terminal 2: Run the POC script
cd packages-native/debug
npx tsx poc/debug-todomvc.ts ws://127.0.0.1:9229/...

# Then add a todo in the browser to trigger the breakpoint
```

## Expected Output

```
Discovering inspector endpoint...
Connecting to ws://127.0.0.1:9229/abc-123...
Connected!
Debugger and Runtime enabled
Setting breakpoint in addTodo handler...
Breakpoint set: 1:0:0:file://...
Waiting for breakpoint hit...
(Add a todo in the app to trigger the breakpoint)

=== Breakpoint Hit! ===
Location: http://localhost:5173/src/atoms/todos.ts:15
Function: addTodo

--- Local Variables ---
Scope: local

--- Reading Application State ---
this: {"text":"Buy milk"}

Resuming execution...

POC complete! Disconnecting...
```

## Challenges to Address

1. **Source Maps**: Vite serves transpiled code, need to handle source maps
2. **URL Matching**: Breakpoint URL must match how Vite serves files
3. **Atom State Access**: Need to figure out how to access effect-atom state from debugger context
4. **Async Timing**: May need to wait for scripts to load before setting breakpoints

## Verification

```bash
# Script runs without error and demonstrates the workflow
node packages-native/debug/poc/debug-todomvc.ts
```
