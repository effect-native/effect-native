/**
 * Error types for the Mesh synchronization engine.
 *
 * @since 0.1.0
 */
import * as Data from "effect/Data"

/**
 * Error when a protocol message fails decoding/validation.
 * The message is dropped and processing continues.
 *
 * @since 0.1.0
 * @category Errors
 */
export class ProtocolError extends Data.TaggedError("MeshProtocolError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when transactional apply of changes fails and is rolled back.
 *
 * @since 0.1.0
 * @category Errors
 */
export class ApplyFailed extends Data.TaggedError("ApplyFailed")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when the sync loop is interrupted due to shutdown or transport closure.
 * This is the normal termination signal for the run effect.
 *
 * @since 0.1.0
 * @category Errors
 */
export class SyncInterrupted extends Data.TaggedError("SyncInterrupted")<{
  readonly reason?: string
}> {}
