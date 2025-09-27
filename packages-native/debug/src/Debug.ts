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

export * from "./DebugModel.js"

/**
 * Live CDP layer implementation.
 * @since 0.0.0
 */
export const layerCdp: Layer.Layer<Service, never, Socket.WebSocketConstructor> = layer
