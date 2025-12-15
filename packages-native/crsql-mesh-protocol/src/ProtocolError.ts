/**
 * Error types for the mesh protocol.
 *
 * @since 0.1.0
 */
import * as Schema from "effect/Schema"

/**
 * Error indicating that the `unhex()` function is not available in SQLite.
 *
 * This error occurs during protocol layer initialization when the capability
 * check for `unhex()` fails. Modern SQLite (>= 3.41.0) includes `unhex()` by
 * default, but some builds may have it disabled.
 *
 * @since 0.1.0
 * @category Errors
 */
export class UnhexUnavailable extends Schema.TaggedError<UnhexUnavailable>(
  "@effect-native/crsql-mesh-protocol/UnhexUnavailable"
)("UnhexUnavailable", {
  cause: Schema.optional(Schema.Defect)
}) {}

/**
 * Error indicating that an incoming message failed schema validation/decoding.
 *
 * This is an expected error when receiving malformed or incompatible messages
 * from remote peers. Callers should drop or reject the message.
 *
 * @since 0.1.0
 * @category Errors
 */
export class ProtocolError extends Schema.TaggedError<ProtocolError>(
  "@effect-native/crsql-mesh-protocol/ProtocolError"
)("ProtocolError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect)
}) {}
