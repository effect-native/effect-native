/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Thin wrappers around @effect/platform/Socket for Expo/React Native.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket: typeof Socket.makeWebSocket = (url, options) =>
  Socket.makeWebSocket(url, options)

/**
 * Provides the global WebSocket constructor from Expo/React Native.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketConstructor = Socket.layerWebSocketConstructorGlobal

/**
 * Convenience: build a `Socket.Socket` layer for a URL, using Expo's global WebSocket.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url: string, options?: {
  readonly closeCodeIsError?: ((code: number) => boolean) | undefined
  readonly openTimeout?: import("effect/Duration").DurationInput | undefined
  readonly protocols?: string | Array<string> | undefined
}) => Layer.scoped(Socket.Socket, Effect.provide(Socket.makeWebSocket(url, options), layerWebSocketConstructor))
