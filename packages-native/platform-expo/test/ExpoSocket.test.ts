import { Socket } from "@effect/platform"
import { assert, describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Queue, Stream } from "effect"
import { WS } from "vitest-websocket-mock"
import * as ExpoSocket from "../src/ExpoSocket.js"

describe("ExpoSocket", () => {
  describe("WebSocket", () => {
    const url = "ws://localhost:1234"

    const makeServer = Effect.acquireRelease(
      Effect.sync(() => new WS(url)),
      (ws) =>
        Effect.sync(() => {
          ws.close()
          WS.clean()
        })
    )

    it.scoped("basic connection", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))

        // Verify connection is established
        yield* Effect.promise(async () => {
          await server.connected
        })

        // Close connection
        server.close()
        const fiber = yield* Effect.fork(socket.run(() => Effect.void))
        const exit = yield* fiber.await
        expect(exit._tag).toEqual("Success")
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("send and receive messages", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))

        yield* Effect.gen(function*() {
          const write = yield* socket.writer
          yield* write(new TextEncoder().encode("Hello"))
          yield* write(new TextEncoder().encode("World"))
        }).pipe(Effect.scoped)

        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Hello"))
          await expect(server).toReceiveMessage(new TextEncoder().encode("World"))
        })

        server.send("Right back at you!")
        let message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("Right back at you!"))

        server.send(new Blob(["A Blob message"]))
        message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("A Blob message"))

        server.close()
        const exit = yield* fiber.await
        expect(exit._tag).toEqual("Success")
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("handle binary data", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))

        // Send binary data
        const binaryData = new Uint8Array([1, 2, 3, 4, 5])
        yield* Effect.gen(function*() {
          const write = yield* socket.writer
          yield* write(binaryData)
        }).pipe(Effect.scoped)

        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(binaryData)
        })

        // Receive binary data
        const responseBinary = new Uint8Array([10, 20, 30])
        server.send(responseBinary)
        const message = yield* messages.take
        expect(message).toEqual(responseBinary)

        server.close()
        yield* fiber.await
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("stream integration", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const channel = Socket.makeWebSocketChannel(Effect.succeed(url))

        const outputEffect = Stream.make("Hello", "World").pipe(
          Stream.encodeText,
          Stream.pipeThroughChannel(channel),
          Stream.take(2),
          Stream.decodeText(),
          Stream.mkString,
          Stream.runCollect
        )

        const fiber = yield* Effect.fork(outputEffect)

        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Hello"))
          await expect(server).toReceiveMessage(new TextEncoder().encode("World"))
        })

        // Echo messages back
        server.send("Hello")
        server.send("World")

        const output = yield* fiber.await
        assert.strictEqual(Chunk.join(output, ""), "HelloWorld")

        server.close()
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("error handling - connection failure", () =>
      Effect.gen(function*() {
        const invalidUrl = "ws://invalid-host:9999"
        const result = yield* Socket.makeWebSocket(Effect.succeed(invalidUrl)).pipe(
          Effect.flip
        )
        assert(result._tag === "SocketError" || result._tag === "WebSocketError")
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => {
          throw new Error("Connection refused")
        })
      ))

    it.scoped("error handling - server close", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))

        // Server closes with error code
        server.close({ code: 1006, reason: "Abnormal closure" })

        const exit = yield* fiber.await
        expect(exit._tag).toEqual("Success")
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("reconnection logic", () =>
      Effect.gen(function*() {
        let connectionAttempts = 0
        const socket = yield* Socket.makeWebSocket(Effect.sync(() => {
          connectionAttempts++
          return url
        }))

        const server = yield* makeServer

        yield* Effect.promise(async () => {
          await server.connected
        })

        expect(connectionAttempts).toEqual(1)

        server.close()
        const fiber = yield* Effect.fork(socket.run(() => Effect.void))
        yield* fiber.await
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))

    it.scoped("large message handling", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))

        // Create a large message (1MB)
        const largeData = new Uint8Array(1024 * 1024)
        for (let i = 0; i < largeData.length; i++) {
          largeData[i] = i % 256
        }

        yield* Effect.gen(function*() {
          const write = yield* socket.writer
          yield* write(largeData)
        }).pipe(Effect.scoped)

        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(largeData)
        })

        // Echo large message back
        server.send(largeData)
        const message = yield* messages.take
        expect(message.length).toEqual(largeData.length)
        expect(message[0]).toEqual(0)
        expect(message[1000]).toEqual(1000 % 256)

        server.close()
        yield* fiber.await
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))
  })

  describe("WebSocket with Expo layer", () => {
    it.scoped("using ExpoSocket layer", () =>
      Effect.gen(function*() {
        const url = "ws://localhost:5678"
        const server = yield* Effect.acquireRelease(
          Effect.sync(() => new WS(url)),
          (ws) =>
            Effect.sync(() => {
              ws.close()
              WS.clean()
            })
      )

      const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))

        yield* Effect.gen(function*() {
          const write = yield* socket.writer
          yield* write(new TextEncoder().encode("Test with Expo layer"))
        }).pipe(Effect.scoped)

        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Test with Expo layer"))
        })

        server.send("Response from server")
        const message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("Response from server"))

        server.close()
        yield* fiber.await
      }).pipe(
        Effect.provide(ExpoSocket.layerWebSocketConstructor)
      ))
  })

  describe("closeCodeIsError default", () => {
    it("treats 1000 and 1006 as clean", () => {
      expect(Socket.defaultCloseCodeIsError(1000)).toEqual(false)
      expect(Socket.defaultCloseCodeIsError(1006)).toEqual(false)
      expect(Socket.defaultCloseCodeIsError(1001)).toEqual(true)
    })
  })
})
