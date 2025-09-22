/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { Service as MiniDomService } from "../core/Service.js"
import * as Service from "../core/Service.js"

import { createService } from "./internal/createService.js"

/**
 * @since 1.0.0
 * @category options
 */
export interface WindowMiniDomOptions {
  readonly window: Window
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: WindowMiniDomOptions): Effect.Effect<MiniDomService> =>
  Effect.sync(() => createService(options.window))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: WindowMiniDomOptions): Layer.Layer<MiniDomService> =>
  Layer.effect(Service.Tag, make(options))

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = Service.Tag
