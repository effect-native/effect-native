/**
 * DOMAdapter Module
 *
 * Provides Effect-based DOM adapter interface for unified DOM access
 * across different environments (happy-dom, puppeteer, etc.).
 *
 * Uses the locator pattern (ElementRef) to survive DOM mutations.
 *
 * @since 0.1.0
 * @module
 */

import type { Effect } from "effect"
import { Context, Data } from "effect"

// --- Element Reference (Locator Pattern) ---

/**
 * A lazy locator that captures HOW to find an element, not the element itself.
 * This pattern survives DOM mutations - the element is resolved fresh each time.
 *
 * @since 0.1.0
 * @category models
 */
export interface ElementRef {
  readonly selector: string
  readonly parent?: ElementRef
  readonly index?: number
}

/**
 * Creates an ElementRef with a CSS selector.
 *
 * @since 0.1.0
 * @category constructors
 * @example
 * ```ts
 * import { ref } from "@effect-native/opentui-dom/DOMAdapter"
 *
 * const button = ref("button[type=submit]")
 * const nestedInput = ref("input", ref(".form-container"))
 * ```
 */
export function ref(selector: string, parent?: ElementRef): ElementRef {
  return parent ? { selector, parent } : { selector }
}

/**
 * Creates an indexed ElementRef for selecting nth matching element.
 *
 * @since 0.1.0
 * @category constructors
 * @example
 * ```ts
 * import { refNth } from "@effect-native/opentui-dom/DOMAdapter"
 *
 * const secondItem = refNth("li", 1)
 * ```
 */
export function refNth(
  selector: string,
  index: number,
  parent?: ElementRef
): ElementRef {
  return parent ? { selector, index, parent } : { selector, index }
}

// --- Error Types ---

/**
 * Error thrown when an element cannot be found by the given selector.
 *
 * @since 0.1.0
 * @category errors
 */
export class ElementNotFoundError extends Data.TaggedError("ElementNotFoundError")<{
  readonly selector: string
}> {
  override get message(): string {
    return `Element not found: ${this.selector}`
  }
}

/**
 * Error thrown when a single element was expected but multiple were found.
 *
 * @since 0.1.0
 * @category errors
 */
export class MultipleElementsError extends Data.TaggedError("MultipleElementsError")<{
  readonly selector: string
  readonly count: number
}> {
  override get message(): string {
    return `Expected single element for "${this.selector}", found ${this.count}`
  }
}

/**
 * General adapter error for unexpected failures.
 *
 * @since 0.1.0
 * @category errors
 */
export class AdapterError extends Data.TaggedError("AdapterError")<{
  readonly reason: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.reason
  }
}

/**
 * Union type for all DOM errors.
 *
 * @since 0.1.0
 * @category errors
 */
export type DOMError = ElementNotFoundError | MultipleElementsError | AdapterError

// --- Mutation Stream ---

/**
 * Record of a DOM mutation.
 *
 * @since 0.1.0
 * @category models
 */
export interface MutationRecord {
  type: "childList" | "attributes" | "characterData"
  target: unknown
  addedNodes?: Array<unknown>
  removedNodes?: Array<unknown>
  attributeName?: string | null
}

/**
 * Options for mutation observation.
 *
 * @since 0.1.0
 * @category models
 */
export interface MutationObserverInit {
  childList?: boolean
  attributes?: boolean
  characterData?: boolean
  subtree?: boolean
  attributeOldValue?: boolean
  characterDataOldValue?: boolean
  attributeFilter?: Array<string>
}

/**
 * Stream interface for observing DOM mutations.
 *
 * @since 0.1.0
 * @category models
 */
export interface MutationStream {
  subscribe(callback: (records: Array<MutationRecord>) => void): void
  disconnect(): void
}

// --- DOMAdapter Interface ---

/**
 * Abstract interface for DOM operations.
 *
 * All methods return Effect values, enabling transparent sync/async handling
 * and proper error management. Uses the locator pattern (ElementRef) instead
 * of direct element references to survive DOM mutations.
 *
 * @since 0.1.0
 * @category models
 */
export interface DOMAdapter {
  /** Get the document object */
  readonly document: Effect.Effect<Document, AdapterError>

  /** Check if element exists */
  exists(ref: ElementRef): Effect.Effect<boolean, AdapterError>

  /** Count matching elements */
  count(ref: ElementRef): Effect.Effect<number, AdapterError>

  /** Get text content of element */
  textContent(ref: ElementRef): Effect.Effect<string | null, DOMError>

  /** Get innerHTML */
  innerHTML(ref: ElementRef): Effect.Effect<string, DOMError>

  /** Get attribute value */
  getAttribute(ref: ElementRef, name: string): Effect.Effect<string | null, DOMError>

  /** Get computed style property */
  getComputedStyle(ref: ElementRef, property: string): Effect.Effect<string, DOMError>

  /** Get current value of input/textarea/select */
  getValue(ref: ElementRef): Effect.Effect<string, DOMError>

  /** Set input value and fire input event */
  fill(ref: ElementRef, value: string): Effect.Effect<void, DOMError>

  /** Focus element */
  focus(ref: ElementRef): Effect.Effect<void, DOMError>

  /** Blur element */
  blur(ref: ElementRef): Effect.Effect<void, DOMError>

  /** Click element */
  click(ref: ElementRef): Effect.Effect<void, DOMError>

  /** Get active element ref */
  activeElement(): Effect.Effect<ElementRef | null, AdapterError>

  /** Dispatch custom event */
  dispatchEvent(
    ref: ElementRef,
    type: string,
    options?: EventInit
  ): Effect.Effect<void, DOMError>

  /** Create MutationObserver and return stream */
  observeMutations(
    ref: ElementRef,
    options: MutationObserverInit
  ): Effect.Effect<MutationStream, DOMError>
}

// --- Service Tag ---

/**
 * Effect service tag for DOMAdapter.
 *
 * @since 0.1.0
 * @category services
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { DOMAdapterService, ref } from "@effect-native/opentui-dom/DOMAdapter"
 *
 * const clickSubmit = Effect.gen(function* () {
 *   const adapter = yield* DOMAdapterService
 *   const buttonRef = ref("button[type=submit]")
 *   const exists = yield* adapter.exists(buttonRef)
 *   if (exists) {
 *     yield* adapter.click(buttonRef)
 *   }
 * })
 * ```
 */
export class DOMAdapterService extends Context.Tag("@effect-native/opentui-dom/DOMAdapterService")<
  DOMAdapterService,
  DOMAdapter
>() {}

// --- Helper: Resolve ElementRef to Element ---

/**
 * Resolves an ElementRef to the actual DOM element.
 *
 * @internal
 */
export function resolveRef(doc: Document, elementRef: ElementRef): Element | null {
  const base = elementRef.parent ? resolveRef(doc, elementRef.parent) : doc
  if (!base) return null

  const elements = (base as Element | Document).querySelectorAll(elementRef.selector)
  return elements[elementRef.index ?? 0] ?? null
}

/**
 * Generates a unique selector for an element.
 *
 * @internal
 */
export function generateSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }

  const tagName = element.tagName.toLowerCase()
  const parent = element.parentElement

  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (el) => el.tagName.toLowerCase() === tagName
    )
    if (siblings.length > 1) {
      const index = siblings.indexOf(element)
      return `${tagName}:nth-of-type(${index + 1})`
    }
  }

  return tagName
}
