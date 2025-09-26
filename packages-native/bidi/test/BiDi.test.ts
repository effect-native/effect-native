import * as BiDi from "@effect-native/bidi/BiDi"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"

describe("BiDi", () => {
  it.effect("correlates command responses", () =>
    Effect.scoped(
      Effect.gen(function*(_) {
        const outgoing = yield* Queue.unbounded<BiDi.OutgoingMessage>()
        const incoming = yield* Queue.unbounded<BiDi.IncomingMessage>()

        const transport: BiDi.Transport = {
          send: (message) => Queue.offer(outgoing, message),
          receive: Queue.take(incoming)
        }

        const bidi = yield* BiDi.make.pipe(
          Effect.provideService(BiDi.Transport, transport)
        )

        const fiber = yield* Effect.fork(
          bidi.send({ method: "session.new", params: { capabilities: {} } })
        )

        const message = yield* Queue.take(outgoing)
        expect(message).toMatchObject({
          method: "session.new",
          params: { capabilities: {} }
        })

        yield* Queue.offer(incoming, {
          id: message.id,
          result: { sessionId: "test" }
        })

        const result = yield* Fiber.join(fiber)
        expect(result).toEqual({ sessionId: "test" })
      })
    ))

  it.effect("fails with CommandFailed when session.new rejects", () =>
    Effect.scoped(
      Effect.gen(function*(_) {
        const outgoing = yield* Queue.unbounded<BiDi.OutgoingMessage>()
        const incoming = yield* Queue.unbounded<BiDi.IncomingMessage>()

        const transport: BiDi.Transport = {
          send: (message) => Queue.offer(outgoing, message),
          receive: Queue.take(incoming)
        }

        const bidi = yield* BiDi.make.pipe(
          Effect.provideService(BiDi.Transport, transport)
        )

        const fiber = yield* Effect.fork(
          bidi.send({ method: "session.new", params: { capabilities: {} } })
        )

        const message = yield* Queue.take(outgoing)
        yield* Queue.offer(incoming, {
          id: message.id,
          error: {
            error: "session.error",
            message: "not allowed"
          }
        })

        const failure = yield* Fiber.join(fiber).pipe(Effect.flip)
        if ((failure as { readonly _tag?: string })._tag !== "CommandFailed") {
          throw new Error(`unexpected failure: ${JSON.stringify(failure)}`)
        }
        expect(failure.method).toBe("session.new")
        expect(failure.error.error).toBe("session.error")
      })
    ))

  it.effect("closes the transport when an event handler dies", () =>
    Effect.scoped(
      Effect.gen(function*(_) {
        const outgoing = yield* Queue.unbounded<BiDi.OutgoingMessage>()
        const incoming = yield* Queue.unbounded<BiDi.IncomingMessage>()

        const transport: BiDi.Transport = {
          send: (message) => Queue.offer(outgoing, message),
          receive: Queue.take(incoming)
        }

        const bidi = yield* BiDi.make.pipe(
          Effect.provideService(BiDi.Transport, transport)
        )

        yield* bidi.onEvent("session.event", () => Effect.die("boom"))

        yield* Queue.offer(incoming, {
          method: "session.event",
          params: {}
        })

        const failure = yield* bidi.send({ method: "session.status" }).pipe(Effect.flip)
        if ((failure as { readonly _tag?: string })._tag !== "TransportClosed") {
          throw new Error(`unexpected failure: ${JSON.stringify(failure)}`)
        }
      })
    ))
})
