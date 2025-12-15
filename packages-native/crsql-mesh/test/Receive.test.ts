/**
 * Tests for receive routing behavior.
 * Phase B1 (RED): Specify how Transport.receive bytes are decoded and routed.
 */
import * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as InMemoryTransport from "@effect-native/crsql-mesh-transport/InMemoryTransport"
import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Queue, Ref, Stream } from "effect"

const SITE_A = "00000000000000000000000000000001" as Messages.SiteIdHex
const SITE_B = "00000000000000000000000000000002" as Messages.SiteIdHex

/**
 * Encode a MeshMessage to transport bytes (JSON for simplicity in tests).
 */
const encodeMessage = (msg: Messages.MeshMessage): Uint8Array => new TextEncoder().encode(JSON.stringify(msg))

describe("Receive routing", () => {
  describe("decodes Transport.receive bytes via protocol", () => {
    it.effect("valid VersionSummary messages are decoded and routed", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(SITE_A)
        const peerB = mesh.createPeer(SITE_B)

        // Track received messages
        const receivedMessages = yield* Queue.unbounded<Messages.MeshMessage>()

        yield* peerA.open
        yield* peerB.open

        // Send a valid message from B to A
        const message: Messages.MeshMessage = {
          kind: "VersionSummary",
          seq: 1,
          sender: SITE_B,
          payload: {
            localSiteId: SITE_B,
            peers: {}
          }
        }
        yield* peerB.send({ to: SITE_A, payload: encodeMessage(message) })

        // Flush to deliver
        mesh.flush()

        // Receive on A
        const received = yield* peerA.receive.pipe(
          Stream.take(1),
          Stream.runCollect
        )

        expect(Chunk.size(received)).toBe(1)

        // Decode the message
        const first = Chunk.unsafeGet(received, 0)
        const decoded = JSON.parse(new TextDecoder().decode(first.payload))
        expect(decoded.kind).toBe("VersionSummary")
        expect(decoded.sender).toBe(SITE_B)

        yield* Queue.offer(receivedMessages, decoded as Messages.MeshMessage)

        // Verify
        const msg = yield* Queue.take(receivedMessages)
        expect(msg.kind).toBe("VersionSummary")
      }))
  })

  describe("invalid messages result in ProtocolError and are dropped", () => {
    it.effect("malformed JSON is dropped", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(SITE_A)
        const peerB = mesh.createPeer(SITE_B)

        yield* peerA.open
        yield* peerB.open

        // Send malformed data
        yield* peerB.send({ to: SITE_A, payload: new TextEncoder().encode("not json") })
        mesh.flush()

        // When we try to decode it, it fails
        const received = yield* peerA.receive.pipe(
          Stream.take(1),
          Stream.runCollect
        )

        expect(Chunk.size(received)).toBe(1)

        // Try to decode - this should fail
        const first = Chunk.unsafeGet(received, 0)
        const result = yield* Messages.decodeMeshMessage(
          (() => {
            try {
              return JSON.parse(new TextDecoder().decode(first.payload))
            } catch {
              return { invalid: true }
            }
          })()
        ).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))

    it.effect("invalid message schema is dropped", () =>
      Effect.gen(function*() {
        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(SITE_A)
        const peerB = mesh.createPeer(SITE_B)

        yield* peerA.open
        yield* peerB.open

        // Send invalid schema (missing required fields)
        yield* peerB.send({
          to: SITE_A,
          payload: new TextEncoder().encode(JSON.stringify({ kind: "Unknown", data: 123 }))
        })
        mesh.flush()

        const received = yield* peerA.receive.pipe(
          Stream.take(1),
          Stream.runCollect
        )

        const first = Chunk.unsafeGet(received, 0)
        const result = yield* Messages.decodeMeshMessage(
          JSON.parse(new TextDecoder().decode(first.payload))
        ).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }))
  })

  describe("valid messages are routed by sender", () => {
    it.effect("messages from different peers are distinguishable by sender field", () =>
      Effect.gen(function*() {
        const SITE_C = "00000000000000000000000000000003" as Messages.SiteIdHex

        const mesh = InMemoryTransport.createMesh()
        const peerA = mesh.createPeer(SITE_A)
        const peerB = mesh.createPeer(SITE_B)
        const peerC = mesh.createPeer(SITE_C)

        yield* peerA.open
        yield* peerB.open
        yield* peerC.open

        // B and C both send to A
        const msgFromB: Messages.MeshMessage = {
          kind: "VersionSummary",
          seq: 1,
          sender: SITE_B,
          payload: { localSiteId: SITE_B, peers: {} }
        }

        const msgFromC: Messages.MeshMessage = {
          kind: "VersionSummary",
          seq: 1,
          sender: SITE_C,
          payload: { localSiteId: SITE_C, peers: {} }
        }

        yield* peerB.send({ to: SITE_A, payload: encodeMessage(msgFromB) })
        yield* peerC.send({ to: SITE_A, payload: encodeMessage(msgFromC) })
        mesh.flush()

        // Track senders from received messages
        const senders = yield* Ref.make<Array<Messages.SiteIdHex>>([])

        yield* peerA.receive.pipe(
          Stream.take(2),
          Stream.mapEffect((received) =>
            Effect.gen(function*() {
              const decoded = yield* Messages.decodeMeshMessage(
                JSON.parse(new TextDecoder().decode(received.payload))
              )
              yield* Ref.update(senders, (arr) => [...arr, decoded.sender])
            })
          ),
          Stream.runDrain
        )

        const result = yield* Ref.get(senders)
        expect(result.sort()).toEqual([SITE_B, SITE_C].sort())
      }))
  })
})
