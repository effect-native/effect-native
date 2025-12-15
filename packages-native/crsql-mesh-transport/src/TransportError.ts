/**
 * Error types for Transport operations.
 *
 * @since 0.1.0
 */
import * as Data from "effect/Data"

/**
 * Error when attempting an operation on a closed transport.
 *
 * @since 0.1.0
 * @category Errors
 */
export class TransportClosed extends Data.TaggedError("TransportClosed") {}

/**
 * Error when the target peer cannot be reached.
 *
 * @since 0.1.0
 * @category Errors
 */
export class PeerUnreachable extends Data.TaggedError("PeerUnreachable")<{
  readonly peerId: string
}> {}

/**
 * Generic send failure error.
 *
 * @since 0.1.0
 * @category Errors
 */
export class SendFailed extends Data.TaggedError("SendFailed")<{
  readonly cause?: unknown
}> {}
