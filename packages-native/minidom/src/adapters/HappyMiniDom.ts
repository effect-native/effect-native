/**
 * MiniDom adapter backed by `happy-dom` for deterministic server-side DOM emulation.
 *
 * @since 0.0.0
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Window as HappyWindow } from "happy-dom"

import * as MiniDom from "../MiniDom.js"

import { createService } from "./internal/createService.js"

/**
 * Error emitted when Happy DOM lifecycle operations fail.
 *
 * @since 0.0.0
 * @category errors
 */
export class HappyMiniDomError extends Data.TaggedError("HappyMiniDomError")<{
  readonly message: string
  readonly cause?: unknown
}> {
  constructor(options?: { readonly message?: string; readonly cause?: unknown }) {
    super({
      message: options?.message ?? "HappyMiniDom adapter failed to finalize",
      cause: options?.cause
    })
  }
}

/**
 * Options for creating the Happy DOM-backed MiniDom service.
 *
 * @since 0.0.0
 * @category options
 */
export interface HappyMiniDomOptions {
  readonly window?: HappyWindow
  readonly url?: string
}

const createWindow = (options?: HappyMiniDomOptions): HappyWindow => {
  if (options?.window) {
    return options.window
  }
  if (options?.url) {
    return new HappyWindow({ url: options.url })
  }
  return new HappyWindow()
}

/**
 * Constructs a MiniDom service powered by `happy-dom`.
 *
 * @since 0.0.0
 * @category constructors
 */
export const make = (options?: HappyMiniDomOptions) =>
  Effect.sync(() => createService(createWindow(options) as unknown as Window))

/**
 * Layer that scopes a Happy DOM window and exposes the MiniDom service.
 *
 * @since 0.0.0
 * @category layers
 */
export const layer = (options?: HappyMiniDomOptions) =>
  Layer.scoped(
    MiniDom.MiniDom,
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
          ? Effect.try({
            try: () => {
              if (typeof window.close === "function") {
                window.close()
              }
            },
            catch: (cause) => new HappyMiniDomError({ cause })
          })
          : Effect.void
    ).pipe(Effect.map((state) => state.service))
  )
