import * as Effect from "effect/Effect"
import { flushSync } from "react-dom"
import { createRoot, type Root, type RootOptions } from "react-dom/client"
import type { RenderDriver } from "./Driver.js"

export interface DomRoot {
  readonly container: Element
  readonly root: Root
}

export interface DomOptions {
  readonly container: Element
}

export interface DomDriverConfig {
  readonly rootOptions?: RootOptions
}

export type DomDriver = RenderDriver<DomOptions, DomRoot>

export const driver = (config?: DomDriverConfig): DomDriver => ({
  make: (options) =>
    Effect.acquireRelease(
      Effect.sync(() => ({
        container: options.container,
        root: createRoot(options.container, config?.rootOptions)
      } satisfies DomRoot)),
      ({ root }) =>
        Effect.sync(() => {
          root.unmount()
        })
    ),
  render: (domRoot, element) =>
    Effect.sync(() => {
      flushSync(() => {
        domRoot.root.render(element)
      })
    })
})
