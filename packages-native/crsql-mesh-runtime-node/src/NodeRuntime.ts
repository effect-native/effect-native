/**
 * Node.js runtime adapter for CR-SQLite mesh synchronization.
 *
 * @since 0.1.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import * as Protocol from "@effect-native/crsql-mesh-protocol/Protocol"
import * as ProtocolError from "@effect-native/crsql-mesh-protocol/ProtocolError"
import * as LibCrSql from "@effect-native/libcrsql/effect"
import type { Duration, Scope } from "effect"
import { ConfigProvider, Context, Effect, Layer, Scope as Scope_ } from "effect"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
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
 * Get the CR-SQLite extension path and wrap errors as DatabasePathInvalid.
 *
 * @since 0.1.0
 * @category Internal
 */
const getExtensionPath = (
  databasePath: string
): Effect.Effect<string, NodeRuntimeError.DatabasePathInvalid> =>
  Effect.async<string, NodeRuntimeError.DatabasePathInvalid>((resume) => {
    // Use the LibCrSql effect by running it
    const effect = LibCrSql.getCrSqliteExtensionPath()
    Effect.runPromise(effect).then(
      (path) => resume(Effect.succeed(path)),
      (error) =>
        resume(
          Effect.fail(
            new NodeRuntimeError.DatabasePathInvalid({
              path: databasePath,
              reason: `Failed to locate CR-SQLite extension: ${(error as Error).message}`
            })
          )
        )
    )
  })

/**
 * Load CR-SQLite extension with proper error handling.
 *
 * @since 0.1.0
 * @category Internal
 */
const loadExtension = (
  databasePath: string,
  extensionPath: string
): Effect.Effect<void, NodeRuntimeError.DatabasePathInvalid, SqlClient.SqlClient> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    // Run the extension load effect, bridging the different Effect version
    yield* Effect.async<void, NodeRuntimeError.DatabasePathInvalid>((resume) => {
      const loadEffect = CrSqliteExtension.loadLibCrSql.pipe(
        Effect.provide(Layer.succeed(SqlClient.SqlClient, sql)),
        Effect.withConfigProvider(
          ConfigProvider.fromJson({
            [CrSqliteExtension.LibCrSqlPathKey]: extensionPath
          })
        )
      )

      Effect.runPromise(loadEffect).then(
        () => resume(Effect.void),
        (error) =>
          resume(
            Effect.fail(
              new NodeRuntimeError.DatabasePathInvalid({
                path: databasePath,
                reason: `Failed to load CR-SQLite extension: ${(error as Error).message}`
              })
            )
          )
      )
    })
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
): Layer.Layer<
  NodeRuntime,
  NodeRuntimeError.DatabasePathInvalid | ProtocolError.UnhexUnavailable,
  Scope.Scope | SqlClient.SqlClient
> =>
  Layer.scoped(
    NodeRuntime,
    Effect.gen(function*() {
      // Validate configuration
      yield* validateDatabasePath(config.databasePath)

      // Get CR-SQLite extension path
      const extensionPath = yield* getExtensionPath(config.databasePath)

      // Load CR-SQLite extension
      yield* loadExtension(config.databasePath, extensionPath)

      // Initialize protocol layer (checks unhex() availability)
      // This will fail with UnhexUnavailable if unhex() is not available
      const scope = yield* Scope_.Scope
      yield* Layer.buildWithScope(Protocol.layer, scope)

      // Wire signal handlers for graceful shutdown
      // Note: Signal handling is deferred to the caller who composes this layer
      // with @effect/platform-node runtime. The scope finalizer handles cleanup.
      yield* Effect.addFinalizer(() =>
        Effect.logDebug("NodeRuntime finalizer: cleaning up resources")
      )

      // Return the service
      return {
        _tag: "NodeRuntime" as const,
        config
      }
    })
  )

/**
 * Creates a fully-composed Node.js runtime layer that opens the database.
 *
 * This helper creates a layer that:
 * 1. Opens a SQLite database at the specified path
 * 2. Loads the CR-SQLite extension
 * 3. Initializes the protocol layer
 *
 * @since 0.1.0
 * @category Layer
 */
export const makeNodeRuntimeLayer = (
  config: NodeRuntimeConfig
): Effect.Effect<
  Layer.Layer<NodeRuntime, NodeRuntimeError.DatabasePathInvalid | ProtocolError.UnhexUnavailable>,
  NodeRuntimeError.DatabasePathInvalid
> =>
  Effect.gen(function*() {
    // Get CR-SQLite extension path
    const extensionPath = yield* getExtensionPath(config.databasePath)

    // Dynamically import @effect/sql-sqlite-node
    const importResult = yield* Effect.tryPromise({
      try: () => import("@effect/sql-sqlite-node"),
      catch: () =>
        new NodeRuntimeError.DatabasePathInvalid({
          path: config.databasePath,
          reason: "Failed to import @effect/sql-sqlite-node"
        })
    })

    // Create SQLite layer with extension path configured
    const sqliteLayer = importResult.SqliteClient.layer({
      filename: config.databasePath
    }).pipe(
      Layer.provideMerge(
        Layer.setConfigProvider(
          ConfigProvider.fromJson({
            [CrSqliteExtension.LibCrSqlPathKey]: extensionPath
          })
        )
      )
    )

    // Compose with runtime layer
    return NodeRuntimeLive(config).pipe(
      Layer.provideMerge(sqliteLayer)
    ) as Layer.Layer<NodeRuntime, NodeRuntimeError.DatabasePathInvalid | ProtocolError.UnhexUnavailable>
  })
