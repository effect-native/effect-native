import * as NodeSocket from "@effect/platform-node/NodeSocket"
import type * as Socket from "@effect/platform/Socket"
import { describe, expect, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as inspector from "node:inspector"
import { WebSocketServer } from "ws"
import { command as debugCommand, Debug, layerCdp, Transport as DebugTransport } from "../src/Debug.js"
import type { Service as DebugService } from "../src/DebugModel.js"

type CloseFn = () => Promise<void>

interface TestCdpServer {
  readonly url: string
  readonly seenIds: () => ReadonlyArray<number>
  readonly close: CloseFn
}

// TODO: refactor to use @effect/rpc
const makeTestCdpServer: Effect.Effect<TestCdpServer, Error, Scope.Scope> = Effect.acquireRelease(
  Effect.async<TestCdpServer, Error>((resume) => {
    const wss = new WebSocketServer({ port: 0 })
    const seenIds: Array<number> = []

    const fail = (cause: unknown) => {
      for (const client of wss.clients) {
        client.terminate()
      }
      wss.close()
      resume(Effect.fail(cause instanceof Error ? cause : new Error(String(cause))))
    }

    wss.once("error", fail)

    wss.on("connection", (socket) => {
      socket.on("message", (raw) => {
        const text = typeof raw === "string" ? raw : raw.toString()
        const packet = JSON.parse(text) as {
          readonly id?: number
          readonly method?: string
        }
        const id = packet.id
        if (typeof id === "number") {
          seenIds.push(id)
          switch (packet.method) {
            case "Browser.getVersion": {
              socket.send(JSON.stringify({
                id,
                result: {
                  protocolVersion: "1.3",
                  product: "TestBrowser/1.0",
                  revision: "12345",
                  userAgent: "TestBrowser/1.0"
                }
              }))
              return
            }
            case "Runtime.enable": {
              socket.send(JSON.stringify({ id, result: {} }))
              socket.send(JSON.stringify({
                method: "Runtime.consoleAPICalled",
                params: {
                  type: "log",
                  args: [
                    { type: "string", value: "hello" }
                  ]
                }
              }))
              return
            }
            default: {
              socket.send(JSON.stringify({ id, result: { ack: packet.method } }))
              return
            }
          }
        }
      })
    })

    wss.on("listening", () => {
      const address = wss.address()
      if (!address || typeof address !== "object") {
        fail(new Error("Failed to acquire server address"))
        return
      }
      const { port } = address
      resume(
        Effect.succeed({
          url: `ws://127.0.0.1:${port}/devtools/page/1`,
          seenIds: () => seenIds,
          close: () =>
            new Promise<void>((resolve) => {
              for (const client of wss.clients) {
                client.terminate()
              }
              wss.close(() => resolve())
            })
        })
      )
    })
  }),
  (server) => Effect.promise(server.close)
)

const BrowserGetVersion = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Browser.getVersion",
  response: Schema.Struct({
    protocolVersion: Schema.String,
    product: Schema.String,
    revision: Schema.String,
    userAgent: Schema.String
  })
})

const RuntimeEnable = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Runtime.enable",
  response: Schema.Struct({})
})

const RuntimeEvaluate = debugCommand({
  transport: DebugTransport.cdp(),
  command: "Runtime.evaluate",
  params: { expression: "21 * 2" },
  response: Schema.Struct({
    result: Schema.Struct({
      type: Schema.String,
      value: Schema.optional(Schema.Number),
      description: Schema.optional(Schema.String)
    })
  })
})

const makeNodeInspectorSession: Effect.Effect<string, Error, Scope.Scope> = Effect.acquireRelease(
  Effect.gen(function*() {
    inspector.close()
    inspector.open(0, "127.0.0.1", false)
    const url = inspector.url()
    return url ? url : yield* Effect.fail(new Error("Inspector URL unavailable"))
  }),
  () => Effect.sync(() => inspector.close())
)

const withDebugEnvironment = <A, E>(
  effect: Effect.Effect<A, E, DebugService | Socket.WebSocketConstructor>
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(layerCdp),
    Effect.provide(NodeSocket.layerWebSocketConstructor)
  )

describe.sequential("Debug CDP connection", () => {
  it.effect("connects and fetches browser metadata", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const server = yield* makeTestCdpServer
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: server.url,
            transport: DebugTransport.cdp()
          })
          const version = yield* debug.sendCommand(session, BrowserGetVersion)
          expect(version.product).toBe("TestBrowser/1.0")
          expect(version.userAgent).toBe("TestBrowser/1.0")
          const runtimeEnabled = yield* debug.sendCommand(session, RuntimeEnable)
          expect(runtimeEnabled).toEqual({})
          expect(server.seenIds()).toEqual([1, 2])
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect("emits protocol events via subscribe", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const server = yield* makeTestCdpServer
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: server.url,
            transport: DebugTransport.cdp()
          })
          const events = yield* debug.subscribe(session)
          const collector = yield* Stream.take(events, 1).pipe(Stream.runCollect, Effect.forkScoped)
          yield* debug.sendCommand(session, RuntimeEnable)
          yield* Effect.yieldNow()
          const chunk = yield* Fiber.join(collector)
          const head = Chunk.head(chunk)
          expect(Option.map(head, (event) => event.method)).toEqual(Option.some("Runtime.consoleAPICalled"))
        })
      )
    ).pipe(Effect.orDie))

  it.effect("connects to Node inspector", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const inspectorSession = yield* makeNodeInspectorSession
          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint: inspectorSession,
            transport: DebugTransport.cdp()
          })
          const evaluation = yield* debug.sendCommand(session, RuntimeEvaluate)
          expect(evaluation.result.type).toBe("number")
          expect(evaluation.result.value).toBe(42)
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))

  it.effect("connects via Node debug target discovery", () =>
    withDebugEnvironment(
      Effect.scoped(
        Effect.gen(function*() {
          const inspectorSession = yield* makeNodeInspectorSession
          const inspectorUrl = new URL(inspectorSession)
          const targets = yield* Effect.tryPromise({
            try: async () => {
              const response = await fetch(`http://${inspectorUrl.host}/json/list`)
              if (!response.ok) {
                throw new Error(`Inspector target discovery failed with status ${response.status}`)
              }
              return response.json() as Promise<unknown>
            },
            catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
          })

          if (!Array.isArray(targets)) {
            return yield* Effect.fail(new Error("Inspector target list is not an array"))
          }

          const firstTarget = targets[0]

          if (firstTarget === undefined || typeof firstTarget !== "object" || firstTarget === null) {
            return yield* Effect.fail(new Error("Inspector target list is empty"))
          }

          const nodeTarget = firstTarget as { readonly type?: unknown; readonly webSocketDebuggerUrl?: unknown }
          expect(nodeTarget.type).toBe("node")

          const endpoint = nodeTarget.webSocketDebuggerUrl

          if (typeof endpoint !== "string") {
            return yield* Effect.fail(new Error("Inspector target missing webSocketDebuggerUrl"))
          }

          const debug = yield* Debug
          const session = yield* debug.connect({
            endpoint,
            transport: DebugTransport.cdp()
          })
          const evaluation = yield* debug.sendCommand(session, RuntimeEvaluate)
          expect(evaluation.result.type).toBe("number")
          expect(evaluation.result.value).toBe(42)
          yield* debug.disconnect(session)
        })
      )
    ).pipe(Effect.orDie))
})
