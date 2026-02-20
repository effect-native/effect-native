/**
 * Public Debug service exports.
 *
 * @category Debug
 * @since 0.0.0
 */
import type { Socket as SocketNS } from "effect/unstable/socket"
import type * as Layer from "effect/Layer"
import type { Service, Transport } from "./DebugModel.js"
import { layer } from "./internal/Cdp.js"

/**
 * Re-export Debug service types and errors.
 *
 * @category Debug
 * @since 0.0.0
 */
export * from "./DebugModel.js"

/**
 * Live CDP layer implementation.
 * Provides both the Debug service and CurrentTransport context.
 *
 * @category Layer
 * @since 0.0.0
 */
export const layerCdp: Layer.Layer<Service | Transport, never, SocketNS.WebSocketConstructor> = layer
