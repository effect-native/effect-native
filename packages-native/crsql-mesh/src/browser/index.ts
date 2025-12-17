/**
 * Browser Multi-Tab Coordination
 *
 * This module provides components for multi-tab database access in browsers:
 *
 * - **Coordinator**: Manages provider election and message routing between tabs
 * - **Provider**: Owns the OPFS database connection and processes requests serially
 *
 * Architecture:
 * - One Coordinator (SharedWorker) per origin
 * - One Provider (dedicated Worker) elected per database
 * - Multiple Clients (main thread) connect through Coordinator
 *
 * Key features:
 * - No COOP/COEP headers required (uses opfs-sahpool VFS)
 * - Automatic provider failover when tab closes
 * - Serial execution prevents transaction conflicts
 *
 * @since 0.1.0
 */

/**
 * Coordinator for multi-tab coordination.
 *
 * @since 0.1.0
 */
export {
  Coordinator,
  type ClientId,
  type ProviderId,
  type ConnectedMessage,
  type ProviderElectedMessage,
  type TryBecomeProviderMessage,
  type ForwardRequestMessage,
  type ForwardResponseMessage,
  type DbVersionChangedMessage,
  createSharedWorkerScript
} from "./coordinator.js"

/**
 * Provider for OPFS database ownership.
 *
 * @since 0.1.0
 */
export {
  Provider,
  type ProviderConfig,
  type RpcRequest,
  type RpcResponse,
  type ResultResponse,
  type ErrorResponse,
  type DbVersionNotification,
  type VersionChangeCallback,
  createProviderWorkerScript
} from "./provider.js"

/**
 * Service Worker Coordinator fallback for environments without SharedWorker.
 *
 * Use this when SharedWorker is unavailable (e.g., some mobile browsers).
 * Provides the same election and routing semantics as the SharedWorker coordinator.
 *
 * @since 0.1.0
 */
export { ServiceWorkerCoordinator, createServiceWorkerScript } from "./coordinator-sw.js"
