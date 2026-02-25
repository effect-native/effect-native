/**
 * render() function for testing React components.
 * Similar to @testing-library/react's render.
 */
import React, { type ComponentType, type ReactElement } from "react"
import { flushSync } from "react-dom"
import { createRoot, type Root } from "react-dom/client"
import { type BoundQueries, getQueriesForElement } from "./queries.js"
import { ensureHappyDom } from "./setup.js"

// ----- Types -----

export interface RenderOptions {
  container?: HTMLElement
  baseElement?: HTMLElement
  wrapper?: ComponentType<{ children: React.ReactNode }>
}

export interface RenderResult extends BoundQueries {
  container: HTMLElement
  baseElement: HTMLElement
  unmount: () => void
  rerender: (ui: ReactElement) => void
  asFragment: () => DocumentFragment
  debug: (element?: HTMLElement) => void
}

// ----- Registry for cleanup -----

interface MountedRoot {
  root: Root
  container: HTMLElement
}

const mountedRoots = new Set<MountedRoot>()

// ----- render() -----

export function render(ui: ReactElement, options: RenderOptions = {}): RenderResult {
  ensureHappyDom()

  const {
    baseElement = document.body,
    container = document.body.appendChild(document.createElement("div")),
    wrapper: Wrapper
  } = options

  const root = createRoot(container)

  const wrapUi = (element: ReactElement): ReactElement => {
    if (Wrapper) {
      return React.createElement(Wrapper, null, element)
    }
    return element
  }

  // Render the UI synchronously
  flushSync(() => {
    root.render(wrapUi(ui))
  })

  // Track for cleanup
  const mountedRoot: MountedRoot = { root, container }
  mountedRoots.add(mountedRoot)

  // Bind queries to container
  const queries = getQueriesForElement(container)

  return {
    container,
    baseElement,

    unmount: () => {
      flushSync(() => {
        root.unmount()
      })
      if (container.isConnected) {
        container.remove()
      }
      mountedRoots.delete(mountedRoot)
    },

    rerender: (newUi: ReactElement) => {
      flushSync(() => {
        root.render(wrapUi(newUi))
      })
    },

    asFragment: () => {
      const fragment = document.createDocumentFragment()
      Array.from(container.childNodes).forEach((node) => {
        fragment.appendChild(node.cloneNode(true))
      })
      return fragment
    },

    debug: (element = container) => {
      // eslint-disable-next-line no-console -- explicit debug helper for test authors
      console.log(element.outerHTML)
    },

    // Spread all bound queries
    ...queries
  }
}

// ----- cleanup() -----

export function cleanup(): void {
  for (const { container, root } of mountedRoots) {
    flushSync(() => {
      root.unmount()
    })
    if (container.isConnected) {
      container.remove()
    }
  }
  mountedRoots.clear()
}
