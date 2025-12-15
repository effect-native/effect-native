/**
 * InMemoryTransport tests for deterministic in-process peer communication.
 *
 * Phase B1 (RED): These tests specify the deterministic delivery behavior
 * for the in-memory transport implementation.
 */
import { describe, expect, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { InMemoryTransport } from "../src/index.js"

const PEER_A = "00000000000000000000000000000001" as const
const PEER_B = "00000000000000000000000000000002" as const

describe("InMemoryTransport", () => {
  describe("peer wiring", () => {
    it("two peers can be wired in-process", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)
        const peerB = mesh.createPeer(PEER_B)

        // Both peers exist and have the Transport interface
        expect(Effect.isEffect(peerA.open)).toBe(true)
        expect(Effect.isEffect(peerB.open)).toBe(true)
      }).pipe(Effect.runPromise))
  })

  describe("message delivery", () => {
    it("sends from one peer appear on the receiver's receive stream", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)
        const peerB = mesh.createPeer(PEER_B)

        yield* peerA.open
        yield* peerB.open

        // Send from A to B
        const payload = new Uint8Array([1, 2, 3, 4])
        yield* peerA.send({ to: PEER_B, payload })

        // Flush to deliver pending messages
        mesh.flush()

        // B receives the message
        const received = yield* peerB.receive.pipe(
          Stream.take(1),
          Stream.runCollect
        )

        expect(Chunk.size(received)).toBe(1)
        const msg = Chunk.unsafeHead(received)
        expect(msg.from).toBe(PEER_A)
        expect(msg.payload).toEqual(payload)
      }).pipe(Effect.runPromise))

    it("ordering is deterministic (FIFO per sender-to-receiver channel)", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)
        const peerB = mesh.createPeer(PEER_B)

        yield* peerA.open
        yield* peerB.open

        // Send multiple messages from A to B
        yield* peerA.send({ to: PEER_B, payload: new Uint8Array([1]) })
        yield* peerA.send({ to: PEER_B, payload: new Uint8Array([2]) })
        yield* peerA.send({ to: PEER_B, payload: new Uint8Array([3]) })

        mesh.flush()

        // B receives in FIFO order
        const received = yield* peerB.receive.pipe(
          Stream.take(3),
          Stream.runCollect
        )

        expect(Chunk.toArray(received).map((m) => m.payload[0])).toEqual([1, 2, 3])
      }).pipe(Effect.runPromise))

    it("duplicate sends are delivered as duplicates (no dedup)", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)
        const peerB = mesh.createPeer(PEER_B)

        yield* peerA.open
        yield* peerB.open

        const payload = new Uint8Array([42])
        yield* peerA.send({ to: PEER_B, payload })
        yield* peerA.send({ to: PEER_B, payload })

        mesh.flush()

        const received = yield* peerB.receive.pipe(
          Stream.take(2),
          Stream.runCollect
        )

        // Both duplicates arrive
        expect(Chunk.size(received)).toBe(2)
        expect(Chunk.unsafeGet(received, 0).payload).toEqual(payload)
        expect(Chunk.unsafeGet(received, 1).payload).toEqual(payload)
      }).pipe(Effect.runPromise))
  })

  describe("close behavior", () => {
    it("close causes the receive stream to end", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)

        yield* peerA.open

        // Close the peer
        yield* peerA.close

        // Stream ends immediately after close
        const received = yield* peerA.receive.pipe(Stream.runCollect)
        expect(Chunk.size(received)).toBe(0)
      }).pipe(Effect.runPromise))

    it("send fails with TransportClosed after close", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(PEER_A)

        yield* peerA.open
        yield* peerA.close

        const result = yield* peerA.send({
          to: PEER_B,
          payload: new Uint8Array([1])
        }).pipe(Effect.either)

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("TransportClosed")
        }
      }).pipe(Effect.runPromise))
  })

  describe("harness API", () => {
    it("createMesh returns a mesh with createPeer and flush methods", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()

        expect(typeof mesh.createPeer).toBe("function")
        expect(typeof mesh.flush).toBe("function")
      }).pipe(Effect.runPromise))
  })
})
