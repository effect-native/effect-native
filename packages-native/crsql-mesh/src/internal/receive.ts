/**
 * Transport receive stream handling, protocol decoding, and routing.
 *
 * @internal
 */
import * as Messages from "@effect-native/crsql-mesh-protocol/Messages"
import * as ProtocolError from "@effect-native/crsql-mesh-protocol/ProtocolError"
import type { Transport } from "@effect-native/crsql-mesh-transport"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

/**
 * Decoded message with metadata from transport.
 *
 * @internal
 */
export interface DecodedMessage {
  readonly message: Messages.MeshMessage
  readonly transportFrom: Messages.SiteIdHex
}

/**
 * Decode raw transport bytes into a MeshMessage.
 * Returns an Effect that fails with ProtocolError on decode failure.
 *
 * @internal
 */
export const decodePayload = (
  payload: Uint8Array
): Effect.Effect<Messages.MeshMessage, ProtocolError.ProtocolError> =>
  Effect.gen(function*() {
    // Parse JSON
    const text = new TextDecoder().decode(payload)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      return yield* Effect.fail(
        new ProtocolError.ProtocolError({
          message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
        })
      )
    }

    // Decode using protocol schema
    return yield* Messages.decodeMeshMessage(parsed)
  })

/**
 * Create a stream of decoded messages from a transport's receive stream.
 * Invalid messages are logged and dropped.
 *
 * @internal
 */
export const createReceiveStream = (
  transport: Transport
): Stream.Stream<DecodedMessage> =>
  transport.receive.pipe(
    Stream.mapEffect((received) =>
      decodePayload(received.payload).pipe(
        Effect.map((message): Option.Option<DecodedMessage> =>
          Option.some({
            message,
            transportFrom: received.from
          })
        ),
        // Log and drop invalid messages
        Effect.catchAll((error) =>
          Effect.gen(function*() {
            yield* Effect.logWarning(`Protocol error from ${received.from}: ${error.message}`)
            return Option.none<DecodedMessage>()
          })
        )
      )
    ),
    // Filter out dropped messages
    Stream.filterMap((opt) => opt)
  )

export { type ProtocolError } from "@effect-native/crsql-mesh-protocol/ProtocolError"
