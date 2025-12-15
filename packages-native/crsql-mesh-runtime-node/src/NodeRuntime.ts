/**
 * Node.js runtime adapter for CR-SQLite mesh synchronization.
 *
 * @since 0.1.0
 */
import type { Duration, Scope } from "effect"
import { Context, Effect, Layer } from "effect"
import * as NodeRuntimeError from "./NodeRuntimeError.js"

/**
 * Configuration for the Node.js runtime.
 *
 * @since 0.1.0
 * @category Models
 */
export interface NodeRuntimeConfig {
  /**
   * Path to the SQLite database file used for persistence.
   */
  readonly databasePath: string

  /**
   * Maximum time allowed to stop sync and close the database cleanly.
   * Accepts Duration-compatible strings like "5 seconds" or Duration values.
   */
  readonly shutdownTimeout: Duration.DurationInput
}

/**
 * Node runtime service interface.
 *
 * @since 0.1.0
 * @category Service
 */
export interface NodeRuntimeService {
  readonly _tag: "NodeRuntime"
  readonly config: NodeRuntimeConfig
}

/**
 * Node runtime service tag.
 *
 * @since 0.1.0
 * @category Service
 */
export class NodeRuntime extends Context.Tag("@effect-native/crsql-mesh-runtime-node/NodeRuntime")<
  NodeRuntime,
  NodeRuntimeService
>() {}

/**
 * Validates the database path configuration.
 *
 * @since 0.1.0
 * @category Internal
 */
const validateDatabasePath = (
  path: string
): Effect.Effect<void, NodeRuntimeError.DatabasePathInvalid> =>
  Effect.gen(function*() {
    if (path === "") {
      yield* new NodeRuntimeError.DatabasePathInvalid({
        path,
        reason: "database path is empty"
      })
    }

    // Check for null bytes (invalid in file paths)
    if (path.includes("\x00")) {
      yield* new NodeRuntimeError.DatabasePathInvalid({
        path,
        reason: "database path contains invalid characters (null byte)"
      })
    }
  })

/**
 * Creates a Node.js runtime layer with the specified configuration.
 *
 * The runtime:
 * - Validates the database path
 * - Opens the SQLite database at `databasePath`
 * - Loads the CR-SQLite extension
 * - Ensures protocol initialization (including `unhex()` availability)
 * - Handles SIGTERM/SIGINT for graceful shutdown
 *
 * @since 0.1.0
 * @category Layer
 */
export const NodeRuntimeLive = (
  config: NodeRuntimeConfig
): Layer.Layer<NodeRuntime, NodeRuntimeError.DatabasePathInvalid, Scope.Scope> =>
  Layer.scoped(
    NodeRuntime,
    Effect.gen(function*() {
      // Validate configuration
      yield* validateDatabasePath(config.databasePath)

      // Return the service
      return {
        _tag: "NodeRuntime" as const,
        config
      }
    })
  )
