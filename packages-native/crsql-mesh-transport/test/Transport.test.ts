/**
 * Transport service interface tests.
 *
 * These tests specify the Transport service tag and interface shape
 * following Phase A1 of the RGRTDD plan.
 */
import { describe, expect, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import { Transport, TransportClosed } from "../src/index.js"

describe("Transport", () => {
  describe("service tag", () => {
    it("is a Context.Tag", () => {
      expect(Context.isTag(Transport)).toBe(true)
    })

    it("has identifier '@effect-native/crsql-mesh-transport/Transport'", () => {
      expect(Transport.key).toBe("@effect-native/crsql-mesh-transport/Transport")
    })
  })

  describe("interface", () => {
    it("interface includes open, close, send, receive", () =>
      Effect.gen(function*() {
        const transport = yield* Transport

        // Verify that interface has the required properties
        // open and close are Effect values (objects), send is a function
        expect(Effect.isEffect(transport.open)).toBe(true)
        expect(Effect.isEffect(transport.close)).toBe(true)
        expect(typeof transport.send).toBe("function")
        // Check receive is a Stream by checking for StreamTypeId symbol
        expect(Stream.StreamTypeId in transport.receive).toBe(true)
      }).pipe(
        Effect.provide(TestTransportLayer),
        Effect.runPromise
      ))
  })

  describe("lifecycle", () => {
    it("operations fail with TransportClosed after close", () =>
      Effect.gen(function*() {
        const transport = yield* Transport

        yield* transport.open
        yield* transport.close

        // After close, send fails with TransportClosed
        const sendResult = yield* transport.send({
          to: "00000000000000000000000000000001",
          payload: new Uint8Array([1, 2, 3])
        }).pipe(Effect.either)

        expect(sendResult._tag).toBe("Left")
        if (sendResult._tag === "Left") {
          expect(sendResult.left._tag).toBe("TransportClosed")
        }
      }).pipe(
        Effect.provide(TestTransportLayer),
        Effect.runPromise
      ))

    it("close is idempotent (calling close multiple times succeeds)", () =>
      Effect.gen(function*() {
        const transport = yield* Transport

        yield* transport.open
        yield* transport.close
        yield* transport.close // Second close is fine
      }).pipe(
        Effect.provide(TestTransportLayer),
        Effect.runPromise
      ))
  })
})

describe("TransportClosed", () => {
  it("is a tagged error", () => {
    const error = new TransportClosed()
    expect(error._tag).toBe("TransportClosed")
  })
})

// A minimal test implementation for verifying interface shape
const TestTransportLayer = Layer.succeed(
  Transport,
  Transport.of({
    open: Effect.void,
    close: Effect.void,
    send: () => Effect.fail(new TransportClosed()),
    receive: Stream.empty
  })
)
