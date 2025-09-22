/**
 * @since 1.0.0
 */
import { Window as HappyWindow } from "happy-dom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { Service as MiniDomService } from "../core/Service.js"
import * as Service from "../core/Service.js"

import { createService } from "./internal/createService.js"

/**
 * @since 1.0.0
 * @category options
 */
export interface HappyMiniDomOptions {
  readonly window?: HappyWindow
  readonly url?: string
}

const createWindow = (options?: HappyMiniDomOptions): HappyWindow =>
  options?.window ?? new HappyWindow({ url: options?.url })

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options?: HappyMiniDomOptions): Effect.Effect<MiniDomService> =>
  Effect.sync(() => createService(createWindow(options) as unknown as Window))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: HappyMiniDomOptions): Layer.Layer<MiniDomService> =>
  Layer.scoped(
    Service.Tag,
    Effect.acquireRelease(
      Effect.sync(() => {
        const provided = options?.window
        const windowInstance = createWindow(options)
        const service = createService(windowInstance as unknown as Window)
        return {
          service,
          window: windowInstance,
          created: provided === undefined
        }
      }),
      ({ created, window }) =>
        created
          ? Effect.sync(() => {
            if (typeof window.close === "function") {
              window.close()
            }
          })
          : Effect.void
    ).pipe(Effect.map((state) => state.service))
  )

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = Service.Tag
