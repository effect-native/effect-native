import { describe, expect, it } from "@effect/vitest"
import {
  Debug,
  Transport as DebugTransport,
  command as debugCommand,
  layerCdp
} from "../src/Debug.js"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as Duration from "effect/Duration"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import type * as Scope from "effect/Scope"
import { WebSocketServer } from "ws"

type CloseFn = () => Promise<void>

interface TestCdpServer {
  readonly url: string
  readonly seenIds: () => ReadonlyArray<number>
  readonly close: CloseFn
}

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

const withDebugEnvironment = <A>(effect: Effect.Effect<A>) =>
  effect.pipe(
    Effect.provide(layerCdp),
    Effect.provide(NodeSocket.layerWebSocketConstructor)
  )

describe("Debug CDP connection", () => {
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
    )
  )

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
          yield* debug.sendCommand(session, RuntimeEnable)
          yield* Effect.yieldNow()
          yield* Effect.sleep(Duration.millis(10))
          const head = yield* Stream.runHead(events)
          expect(Option.map(head, (event) => event.method)).toEqual(Option.some("Runtime.consoleAPICalled"))
        })
      )
    )
  )
})
