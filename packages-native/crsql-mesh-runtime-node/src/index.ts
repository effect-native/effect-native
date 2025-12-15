/**
 * Node.js runtime adapter for CR-SQLite mesh synchronization.
 *
 * This package provides a runtime layer that wires platform capabilities
 * (filesystem persistence and process lifecycle) into the mesh engine.
 *
 * @since 0.1.0
 * @example
 * ```typescript
 * import * as NodeRuntime from "@effect-native/crsql-mesh-runtime-node/NodeRuntime"
 * import { Effect, Layer } from "effect"
 *
 * const runtime = NodeRuntime.NodeRuntimeLive({
 *   databasePath: "./data/mesh.db",
 *   shutdownTimeout: "10 seconds"
 * })
 * ```
 */

/**
 * Node.js runtime layer and configuration.
 *
 * @since 0.1.0
 */
export * as NodeRuntime from "./NodeRuntime.js"

/**
 * Error types for the Node.js runtime.
 *
 * @since 0.1.0
 */
export * as NodeRuntimeError from "./NodeRuntimeError.js"
