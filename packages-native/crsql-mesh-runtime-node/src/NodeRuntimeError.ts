/**
 * Error types for the Node.js runtime adapter.
 *
 * @since 0.1.0
 */
import * as Schema from "effect/Schema"

/**
 * Error indicating that the provided database path is invalid.
 *
 * This error occurs during runtime initialization when the configured
 * `databasePath` cannot be used for persistence (e.g., empty path,
 * invalid characters, inaccessible directory).
 *
 * @since 0.1.0
 * @category Errors
 */
export class DatabasePathInvalid extends Schema.TaggedError<DatabasePathInvalid>(
  "@effect-native/crsql-mesh-runtime-node/DatabasePathInvalid"
)("DatabasePathInvalid", {
  path: Schema.String,
  reason: Schema.String
}) {}

/**
 * Error indicating that shutdown exceeded the configured timeout.
 *
 * This error occurs when the runtime cannot stop mesh fibers and
 * close the database within the specified `shutdownTimeout`.
 *
 * @since 0.1.0
 * @category Errors
 */
export class ShutdownTimeout extends Schema.TaggedError<ShutdownTimeout>(
  "@effect-native/crsql-mesh-runtime-node/ShutdownTimeout"
)("ShutdownTimeout", {
  timeout: Schema.String
}) {}
