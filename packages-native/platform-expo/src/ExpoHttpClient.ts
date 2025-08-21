/**
 * @since 1.0.0
 */
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import type { HttpClient } from "@effect/platform/HttpClient"
import * as Layer from "effect/Layer"

/**
 * Uses Expo's fetch implementation which supports streaming on React Native.
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<HttpClient> = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch as typeof globalThis.fetch))
)
