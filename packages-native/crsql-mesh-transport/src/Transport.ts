/**
 * Transport service definition for peer-to-peer communication.
 *
 * @since 0.1.0
 */
import type { SiteIdHex } from "@effect-native/crsql/CrSqlSchema"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import type { PeerUnreachable, SendFailed, TransportClosed } from "./TransportError.js"

/**
 * A message received from a peer.
 *
 * @since 0.1.0
 * @category Models
 */
export interface ReceivedMessage {
  readonly from: SiteIdHex
  readonly payload: Uint8Array
}

/**
 * Arguments for sending a message to a peer.
 *
 * @since 0.1.0
 * @category Models
 */
export interface SendArgs {
  readonly to: SiteIdHex
  readonly payload: Uint8Array
}

/**
 * The Transport service interface for peer communication.
 *
 * Transport provides a minimal abstraction for moving opaque bytes between peers,
 * without coupling to any particular communication mechanism.
 *
 * @since 0.1.0
 * @category Service
 */
export interface Transport {
  /**
   * Establish underlying resources for the transport.
   */
  readonly open: Effect.Effect<void, TransportClosed>

  /**
   * Close the transport. Idempotent - calling close multiple times succeeds.
   */
  readonly close: Effect.Effect<void>

  /**
   * Send an opaque payload to a specific peer.
   * Best-effort - no delivery guarantees required.
   */
  readonly send: (args: SendArgs) => Effect.Effect<void, TransportClosed | PeerUnreachable | SendFailed>

  /**
   * Stream of messages received from peers.
   * Stream ends when transport closes.
   */
  readonly receive: Stream.Stream<ReceivedMessage>
}

/**
 * Transport service tag.
 *
 * @since 0.1.0
 * @category Tag
 */
export const Transport = Context.GenericTag<Transport>("@effect-native/crsql-mesh-transport/Transport")
