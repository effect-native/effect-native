/**
 * Test Adapter Module
 *
 * Provides a Happy-DOM backed implementation of DOMAdapter for testing.
 *
 * @since 0.1.0
 * @module
 */

import { Effect, Layer } from "effect"
import type { Window as HappyWindow } from "happy-dom"
import {
  AdapterError,
  type DOMAdapter,
  DOMAdapterService,
  type ElementRef,
  generateSelector,
  type MutationObserverInit,
  type MutationRecord,
  type MutationStream,
  resolveRef
} from "./DOMAdapter.js"

// --- Test Environment State ---

let testWindow: HappyWindow | null = null
let testDocument: Document | null = null

/**
 * Ensures the Happy-DOM test environment is initialized.
 *
 * @internal
 */
async function ensureTestEnv(): Promise<{ window: HappyWindow; document: Document }> {
  if (!testDocument || !testWindow) {
    const { Window } = await import("happy-dom")
    testWindow = new Window({ url: "https://localhost" })
    testDocument = testWindow.document as unknown as Document
  }
  return { window: testWindow, document: testDocument }
}

/**
 * Resets the test environment. Call this between tests.
 *
 * @since 0.1.0
 * @category utilities
 */
export function resetTestEnv(): void {
  if (testWindow) {
    testWindow.close()
  }
  testWindow = null
  testDocument = null
}

/**
 * Sets custom HTML content for the test environment.
 *
 * @since 0.1.0
 * @category utilities
 */
export async function setTestHTML(html: string): Promise<void> {
  const { document } = await ensureTestEnv()
  document.body.innerHTML = html
}

/**
 * Gets the current Happy-DOM window instance.
 *
 * @since 0.1.0
 * @category utilities
 */
export async function getTestWindow(): Promise<HappyWindow> {
  const { window } = await ensureTestEnv()
  return window
}

// --- Test Adapter Implementation ---

/**
 * Creates a test adapter backed by Happy-DOM.
 *
 * @since 0.1.0
 * @category constructors
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { createTestAdapter, setTestHTML, resetTestEnv } from "@effect-native/opentui-dom/TestAdapter"
 * import { ref, DOMAdapterService } from "@effect-native/opentui-dom/DOMAdapter"
 *
 * const test = Effect.gen(function* () {
 *   yield* Effect.promise(() => setTestHTML("<button>Click</button>"))
 *   const adapter = yield* DOMAdapterService
 *   const exists = yield* adapter.exists(ref("button"))
 *   // exists === true
 * }).pipe(
 *   Effect.provide(createTestAdapter())
 * )
 * ```
 */
export function createTestAdapter(): Layer.Layer<DOMAdapterService> {
  const adapter: DOMAdapter = {
    get document() {
      return Effect.tryPromise({
        try: () => ensureTestEnv().then(({ document }) => document),
        catch: (error) => new AdapterError({ reason: "Failed to get document", cause: error })
      })
    },

    exists(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          return resolveRef(document, elementRef) !== null
        },
        catch: (error) => new AdapterError({ reason: "Failed to check existence", cause: error })
      })
    },

    count(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const base = elementRef.parent
            ? resolveRef(document, elementRef.parent)
            : document
          if (!base) return 0
          return (base as Element | Document).querySelectorAll(elementRef.selector).length
        },
        catch: (error) => new AdapterError({ reason: "Failed to count elements", cause: error })
      })
    },

    textContent(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)
          return el?.textContent ?? null
        },
        catch: (error) => new AdapterError({ reason: "Failed to get textContent", cause: error })
      })
    },

    innerHTML(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)
          return el?.innerHTML ?? ""
        },
        catch: (error) => new AdapterError({ reason: "Failed to get innerHTML", cause: error })
      })
    },

    getAttribute(elementRef: ElementRef, name: string) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)
          return el?.getAttribute(name) ?? null
        },
        catch: (error) => new AdapterError({ reason: "Failed to get attribute", cause: error })
      })
    },

    getComputedStyle(elementRef: ElementRef, property: string) {
      return Effect.tryPromise({
        try: async () => {
          const { document, window } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)
          if (!el) return ""
          // Cast through unknown for Happy-DOM compatibility
          const styles = window.getComputedStyle(el as unknown as Parameters<typeof window.getComputedStyle>[0])
          return styles.getPropertyValue(property) ?? ""
        },
        catch: (error) => new AdapterError({ reason: "Failed to get computed style", cause: error })
      })
    },

    getValue(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef) as HTMLInputElement | null
          return el?.value ?? ""
        },
        catch: (error) => new AdapterError({ reason: "Failed to get value", cause: error })
      })
    },

    fill(elementRef: ElementRef, value: string) {
      return Effect.tryPromise({
        try: async () => {
          const { document, window } = await ensureTestEnv()
          const el = resolveRef(document, elementRef) as HTMLInputElement | null
          if (el) {
            el.value = value
            el.dispatchEvent(new (window as unknown as typeof globalThis).Event("input", { bubbles: true }))
          }
        },
        catch: (error) => new AdapterError({ reason: "Failed to fill value", cause: error })
      })
    },

    focus(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef) as HTMLElement | null
          if (el && typeof el.focus === "function") {
            el.focus()
          }
        },
        catch: (error) => new AdapterError({ reason: "Failed to focus", cause: error })
      })
    },

    blur(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef) as HTMLElement | null
          if (el && typeof el.blur === "function") {
            el.blur()
          }
        },
        catch: (error) => new AdapterError({ reason: "Failed to blur", cause: error })
      })
    },

    click(elementRef: ElementRef) {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const el = resolveRef(document, elementRef) as HTMLElement | null
          if (el && typeof el.click === "function") {
            el.click()
          }
        },
        catch: (error) => new AdapterError({ reason: "Failed to click", cause: error })
      })
    },

    activeElement() {
      return Effect.tryPromise({
        try: async () => {
          const { document } = await ensureTestEnv()
          const active = document.activeElement
          if (!active || active === document.body) {
            return null
          }
          return { selector: generateSelector(active) }
        },
        catch: (error) => new AdapterError({ reason: "Failed to get active element", cause: error })
      })
    },

    dispatchEvent(elementRef: ElementRef, type: string, options?: EventInit) {
      return Effect.tryPromise({
        try: async () => {
          const { document, window } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)
          if (el) {
            const event = new (window as unknown as typeof globalThis).Event(type, options)
            el.dispatchEvent(event)
          }
        },
        catch: (error) => new AdapterError({ reason: "Failed to dispatch event", cause: error })
      })
    },

    observeMutations(elementRef: ElementRef, options: MutationObserverInit) {
      return Effect.tryPromise({
        try: async () => {
          const { document, window } = await ensureTestEnv()
          const el = resolveRef(document, elementRef)

          let observer: MutationObserver | null = null
          const subscribers: Array<(records: Array<MutationRecord>) => void> = []

          const stream: MutationStream = {
            subscribe(callback: (records: Array<MutationRecord>) => void): void {
              subscribers.push(callback)

              if (!observer && el) {
                observer = new (window as unknown as typeof globalThis).MutationObserver(
                  (records: Array<globalThis.MutationRecord>) => {
                    const mapped = records.map((r) => ({
                      type: r.type as MutationRecord["type"],
                      target: r.target,
                      addedNodes: Array.from(r.addedNodes),
                      removedNodes: Array.from(r.removedNodes),
                      attributeName: r.attributeName
                    }))
                    for (const sub of subscribers) {
                      sub(mapped)
                    }
                  }
                )
                observer.observe(el, options)
              }
            },
            disconnect(): void {
              if (observer) {
                observer.disconnect()
                observer = null
              }
            }
          }

          return stream
        },
        catch: (error) => new AdapterError({ reason: "Failed to observe mutations", cause: error })
      })
    }
  }

  return Layer.succeed(DOMAdapterService, adapter)
}

/**
 * Default test adapter layer for convenience.
 *
 * @since 0.1.0
 * @category layers
 */
export const TestAdapterLive = createTestAdapter()
