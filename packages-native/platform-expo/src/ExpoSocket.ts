/**
 * @since 1.0.0
 */
import * as PlatformError from "@effect/platform/Error"
import * as Socket from "@effect/platform/Socket"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url: string): Effect.Effect<Socket.Socket, PlatformError.PlatformError, Scope.Scope> =>
  Effect.gen(function*() {
    const sendQueue = yield* Queue.unbounded<Uint8Array | string | Socket.CloseEvent>()
    const receiveQueue = yield* Queue.unbounded<Uint8Array | string | Socket.CloseEvent>()
    const openDeferred = yield* Deferred.make<void, PlatformError.PlatformError>()

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      Effect.runSync(Deferred.succeed(openDeferred, void 0))
    }

    ws.onerror = (error) => {
      Deferred.unsafeDone(
        openDeferred,
        Effect.fail(
          new PlatformError.SystemError({
            module: "Stream",
            method: "connect",
            reason: "Unknown",
            pathOrDescriptor: url,
            cause: error instanceof Error ? error : new Error(String(error))
          })
        )
      )
    }

    ws.onmessage = (event) => {
      const data = event.data
      if (typeof data === "string") {
        Effect.runSync(Queue.offer(receiveQueue, data))
      } else if (data instanceof ArrayBuffer) {
        Effect.runSync(Queue.offer(receiveQueue, new Uint8Array(data)))
      }
    }

    ws.onclose = () => {
      Effect.runSync(Queue.offer(receiveQueue, new Socket.CloseEvent()))
    }

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        ws.close()
      })
    )

    yield* Deferred.await(openDeferred)

    yield* Effect.forkScoped(
      Stream.fromQueue(sendQueue).pipe(
        Stream.runForEach((data) =>
          Effect.sync(() => {
            if (Socket.isCloseEvent(data)) {
              ws.close()
            } else {
              ws.send(data as any)
            }
          })
        )
      )
    )

    const write = (chunk: Uint8Array | string | Socket.CloseEvent) => Queue.offer(sendQueue, chunk)

    const writer = Effect.succeed((chunk: Uint8Array | string | Socket.CloseEvent) => write(chunk))

    const run = <R, E, _>(handler: (_: Uint8Array | string | Socket.CloseEvent) => Effect.Effect<_, E, R>) =>
      Stream.fromQueue(receiveQueue).pipe(
        Stream.mapEffect(handler),
        Stream.runDrain
      )

    return {
      [Socket.TypeId]: Socket.TypeId,
      run: (handler: (_: Uint8Array) => Effect.Effect<any, any, any> | void) =>
        run((data) => {
          if (typeof data === "string") {
            const result = handler(new TextEncoder().encode(data))
            return result === undefined ? Effect.void : result
          } else if (Socket.isCloseEvent(data)) {
            return Effect.void
          } else {
            const result = handler(data)
            return result === undefined ? Effect.void : result
          }
        }),
      runRaw: run,
      writer
    } as Socket.Socket
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeNet = (
  _options?: any
): Effect.Effect<Socket.Socket, PlatformError.PlatformError, Scope.Scope> =>
  Effect.fail(
    new PlatformError.BadArgument({
      module: "Stream",
      method: "makeNet",
      description: "TCP sockets are not supported in React Native/Expo"
    })
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url: string): Layer.Layer<Socket.Socket, PlatformError.PlatformError> =>
  Layer.scoped(Socket.Socket, makeWebSocket(url))
