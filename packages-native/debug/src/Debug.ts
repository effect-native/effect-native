export * from "./DebugModel.js"
import type { Service } from "./DebugModel.js"
import { layer } from "./internal/Cdp.js"
import type * as Layer from "effect/Layer"
import type * as Socket from "@effect/platform/Socket"

/**
 * Live CDP layer implementation.
 * @since 0.0.0
 */
export const layerCdp: Layer.Layer<Service, never, Socket.WebSocketConstructor> = layer
