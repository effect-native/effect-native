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
