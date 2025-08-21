/**
 * @since 1.0.0
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import type * as HttpClient from "@effect/platform/HttpClient"
import type * as KeyValueStore from "@effect/platform/KeyValueStore"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as ExpoFileSystem from "./ExpoFileSystem.js"
import * as ExpoHttpClient from "./ExpoHttpClient.js"
import * as ExpoKeyValueStore from "./ExpoKeyValueStore.js"

/**
 * @since 1.0.0
 * @category models
 */
export type ExpoContext =
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | KeyValueStore.KeyValueStore

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ExpoContext> = pipe(
  Layer.mergeAll(
    ExpoFileSystem.layerDocument,
    ExpoHttpClient.layer,
    ExpoKeyValueStore.layerAsyncStorage
  )
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSecure: Layer.Layer<ExpoContext> = pipe(
  Layer.mergeAll(
    ExpoFileSystem.layerDocument,
    ExpoHttpClient.layer,
    ExpoKeyValueStore.layerSecureStore
  )
)
