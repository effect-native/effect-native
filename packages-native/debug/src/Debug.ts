/**
 * Public Debug service exports.
 *
 * @category Debug
 * @since 0.0.0
 */
import type * as Socket from "@effect/platform/Socket"
import type * as Layer from "effect/Layer"
import type { Service } from "./DebugModel.js"
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
 *
 * @category Layer
 * @since 0.0.0
 */
export const layerCdp: Layer.Layer<Service, never, Socket.WebSocketConstructor> = layer
