/**
 * @effect-native/crsql-mesh - Transport-agnostic synchronization engine for CR-SQLite mesh
 *
 * This package provides the orchestration layer for synchronizing CR-SQLite
 * databases across a mesh of peers. It handles version vector comparison,
 * diff computation, and transactional application of incoming changes.
 *
 * @since 0.1.0
 */

/**
 * Mesh service and configuration.
 *
 * @since 0.1.0
 */
export {
  Mesh,
  MeshConfig,
  type MeshConfigShape,
  type MeshDatabase,
  MeshDatabaseTag,
  MeshLive,
  type MeshService,
  type ProgressEvent,
  type VersionVector
} from "./Mesh.js"

/**
 * Error types for mesh operations.
 *
 * @since 0.1.0
 */
export * as MeshError from "./MeshError.js"

/**
 * Browser multi-tab coordination.
 *
 * The browser module provides coordinator and provider components for
 * multi-tab database access without COOP/COEP requirements.
 *
 * - Coordinator: SharedWorker that manages provider election and message routing
 * - Provider: Dedicated Worker that owns the OPFS database connection
 *
 * @since 0.1.0
 */
export * as Browser from "./browser/index.js"
