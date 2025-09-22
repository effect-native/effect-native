/**
 * MiniDom adapter that wraps an existing browser `window` object.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import * as MiniDom from "../MiniDom.js"

import { createService } from "./internal/createService.js"

/**
 * Options required to bridge an existing window into MiniDom.
 *
 * @since 0.0.0
 * @category options
 */
export interface WindowMiniDomOptions {
  readonly window: Window
}

/**
 * Creates a MiniDom service backed by the provided window.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = (options: WindowMiniDomOptions) => Effect.sync(() => createService(options.window))

/**
 * Layer that provides the MiniDom service using the current window.
 *
 * @since 0.0.0
 * @category layers
 */
export const layer = (options: WindowMiniDomOptions) => Layer.effect(MiniDom.MiniDom, make(options))
