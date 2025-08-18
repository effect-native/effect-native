/**
 * @since 1.0.0
 */
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as Layer from "effect/Layer"
import { fetch } from "expo/fetch"

/**
 * Uses Expo's fetch implementation which supports streaming on React Native.
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<HttpClient.HttpClient.Default> = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch as typeof globalThis.fetch))
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerXHR: Layer.Layer<HttpClient.HttpClient.Default> = FetchHttpClient.layerXMLHttpRequest