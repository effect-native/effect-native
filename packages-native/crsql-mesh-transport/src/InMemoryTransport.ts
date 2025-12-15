/**
 * In-memory deterministic transport for testing.
 *
 * Provides a same-process transport useful for testing mesh logic
 * without network dependencies.
 *
 * @since 0.1.0
 */
import type { SiteIdHex } from "@effect-native/crsql/CrSqlSchema"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type { ReceivedMessage, SendArgs, Transport } from "./Transport.js"
import { TransportClosed } from "./TransportError.js"

/**
 * A mesh of in-memory connected peers for testing.
 *
 * @since 0.1.0
 * @category Models
 */
export interface InMemoryMesh {
  /**
   * Create a new peer with the given site ID.
   */
  readonly createPeer: (siteId: SiteIdHex) => Transport

  /**
   * Flush all pending messages to their destinations.
   * This is the mechanism for deterministic test control.
   */
  readonly flush: () => void
}

interface PendingMessage {
  readonly to: SiteIdHex
  readonly from: SiteIdHex
  readonly payload: Uint8Array
}

interface PeerState {
  readonly siteId: SiteIdHex
  readonly isOpen: Ref.Ref<boolean>
  readonly isClosed: Ref.Ref<boolean>
  readonly inboxQueue: Queue.Queue<ReceivedMessage>
}

/**
 * Create a new in-memory mesh for testing.
 *
 * @since 0.1.0
 * @category Constructors
 */
export const createMesh = (): InMemoryMesh => {
  const peers = new Map<SiteIdHex, PeerState>()
  const pendingMessages: Array<PendingMessage> = []

  const createPeer = (siteId: SiteIdHex): Transport => {
    // Create peer state synchronously for test ergonomics
    let peerState: PeerState | undefined

    const initPeer = Effect.gen(function*() {
      if (peerState) return peerState

      const isOpen = yield* Ref.make(false)
      const isClosed = yield* Ref.make(false)
      const inboxQueue = yield* Queue.unbounded<ReceivedMessage>()

      peerState = { siteId, isOpen, isClosed, inboxQueue }
      peers.set(siteId, peerState)
      return peerState
    })

    const open = Effect.gen(function*() {
      const state = yield* initPeer
      const closed = yield* Ref.get(state.isClosed)
      if (closed) {
        return yield* Effect.fail(new TransportClosed())
      }
      yield* Ref.set(state.isOpen, true)
    })

    const close = Effect.gen(function*() {
      const state = yield* initPeer
      yield* Ref.set(state.isClosed, true)
      yield* Ref.set(state.isOpen, false)
      // Shutdown the queue to end the receive stream
      yield* Queue.shutdown(state.inboxQueue)
    })

    const send = (args: SendArgs) =>
      Effect.gen(function*() {
        const state = yield* initPeer
        const closed = yield* Ref.get(state.isClosed)
        if (closed) {
          return yield* Effect.fail(new TransportClosed())
        }
        // Queue the message for delivery on flush
        pendingMessages.push({
          to: args.to,
          from: siteId,
          payload: args.payload
        })
      })

    const receive = Stream.unwrap(
      Effect.gen(function*() {
        const state = yield* initPeer
        return Stream.fromQueue(state.inboxQueue)
      })
    )

    return { open, close, send, receive }
  }

  const flush = (): void => {
    // Deliver all pending messages to their destinations
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift()!
      const targetPeer = peers.get(msg.to)
      if (targetPeer) {
        // Synchronously offer to queue - this is safe because we're in test context
        // and the queue is unbounded
        Effect.runSync(
          Queue.offer(targetPeer.inboxQueue, {
            from: msg.from,
            payload: msg.payload
          })
        )
      }
    }
  }

  return { createPeer, flush }
}
