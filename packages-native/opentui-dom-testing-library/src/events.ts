/**
 * Event simulation utilities for TUI testing.
 * Provides fireEvent functions that work with happy-dom.
 *
 * Key codes are compatible with EventRelay expectations:
 * - TUI uses lowercase names (enter, backspace, up, down)
 * - DOM uses PascalCase (Enter, Backspace, ArrowUp, ArrowDown)
 */

export interface Modifiers {
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

/**
 * Key to code mapping.
 * Maps DOM key values to DOM code values.
 */
const KEY_CODES: Record<string, string> = {
  // Special keys
  Enter: "Enter",
  Tab: "Tab",
  Escape: "Escape",
  " ": "Space",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  // Letters (uppercase)
  ...Object.fromEntries(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => [c, `Key${c}`])
  ),
  // Letters (lowercase)
  ...Object.fromEntries(
    "abcdefghijklmnopqrstuvwxyz"
      .split("")
      .map((c) => [c, `Key${c.toUpperCase()}`])
  ),
  // Numbers
  ...Object.fromEntries(
    "0123456789".split("").map((c) => [c, `Digit${c}`])
  )
}

function keyToCode(key: string): string {
  return KEY_CODES[key] ?? key
}

/**
 * Focusable element selector for tab navigation.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]"
].join(", ")

function getFocusableElements(
  container: Element | Document = document.body
): Array<HTMLElement> {
  const elements = Array.from(
    container.querySelectorAll(FOCUSABLE_SELECTOR)
  ) as Array<HTMLElement>

  // Filter out tabindex="-1" and sort by tabindex
  return elements
    .filter((el) => {
      const tabindex = el.getAttribute("tabindex")
      return tabindex !== "-1"
    })
    .sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("tabindex") ?? "0", 10) || 0
      const bIndex = parseInt(b.getAttribute("tabindex") ?? "0", 10) || 0
      // Elements with tabindex > 0 come first, in order
      // Then elements with tabindex = 0 (or no tabindex) in DOM order
      if (aIndex > 0 && bIndex > 0) return aIndex - bIndex
      if (aIndex > 0) return -1
      if (bIndex > 0) return 1
      return 0
    })
}

/**
 * Special key mapping for {key} syntax in type().
 */
const SPECIAL_KEYS: Record<string, string> = {
  enter: "Enter",
  backspace: "Backspace",
  tab: "Tab",
  escape: "Escape",
  space: " ",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  delete: "Delete",
  home: "Home",
  end: "End"
}

/**
 * Check if element is an input-like element (has value property).
 */
function isInputElement(
  element: Element
): element is HTMLInputElement | HTMLTextAreaElement {
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    "value" in element
  )
}

/**
 * Create a FocusEvent, handling missing global constructor.
 */
function createFocusEvent(type: string, init?: FocusEventInit): Event {
  if (typeof FocusEvent !== "undefined") {
    return new FocusEvent(type, init)
  }
  const event = new Event(type, init)
  if (init?.relatedTarget) {
    ;(event as any).relatedTarget = init.relatedTarget
  }
  return event
}

/**
 * Create an InputEvent, handling missing global constructor.
 */
function createInputEvent(
  type: string,
  init?: { bubbles?: boolean; inputType?: string; data?: string | null }
): Event {
  if (typeof InputEvent !== "undefined") {
    return new InputEvent(type, init)
  }
  const event = new Event(type, { bubbles: init?.bubbles ?? false })
  ;(event as any).inputType = init?.inputType ?? ""
  ;(event as any).data = init?.data ?? null
  return event
}

/**
 * Low-level event creation utilities.
 */
export const createEvent = {
  keyDown(_element: Element, init?: KeyboardEventInit): KeyboardEvent {
    return new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...init
    })
  },

  keyUp(_element: Element, init?: KeyboardEventInit): KeyboardEvent {
    return new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      ...init
    })
  },

  click(_element: Element, init?: MouseEventInit): MouseEvent {
    return new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init
    })
  },

  focus(_element: Element, init?: FocusEventInit): Event {
    return createFocusEvent("focus", {
      bubbles: false,
      ...init
    })
  },

  blur(_element: Element, init?: FocusEventInit): Event {
    return createFocusEvent("blur", {
      bubbles: false,
      ...init
    })
  }
}

/**
 * Event dispatch utilities for testing TUI components.
 *
 * Compatible with EventRelay key expectations:
 * - Enter key triggers click on focused element
 * - Arrow keys (ArrowUp, ArrowDown, etc.) for navigation
 * - Tab for focus navigation
 */
export const fireEvent = {
  /**
   * Dispatch a keydown event.
   * Supports both: keyDown(el, 'Enter') and keyDown(el, { key: 'Enter' })
   */
  keyDown(
    element: Element,
    keyOrInit: string | KeyboardEventInit,
    modifiers?: Modifiers
  ): boolean {
    let key: string
    let init: KeyboardEventInit

    if (typeof keyOrInit === "string") {
      key = keyOrInit
      init = {
        key,
        code: keyToCode(key),
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers?.ctrl ?? false,
        altKey: modifiers?.alt ?? false,
        shiftKey: modifiers?.shift ?? false,
        metaKey: modifiers?.meta ?? false
      }
    } else {
      key = keyOrInit.key ?? ""
      init = {
        bubbles: true,
        cancelable: true,
        ...keyOrInit,
        code: keyOrInit.code ?? keyToCode(key)
      }
    }

    const event = new KeyboardEvent("keydown", init)
    return element.dispatchEvent(event)
  },

  /**
   * Dispatch a keyup event.
   * Supports both: keyUp(el, 'Enter') and keyUp(el, { key: 'Enter' })
   */
  keyUp(
    element: Element,
    keyOrInit: string | KeyboardEventInit,
    modifiers?: Modifiers
  ): boolean {
    let key: string
    let init: KeyboardEventInit

    if (typeof keyOrInit === "string") {
      key = keyOrInit
      init = {
        key,
        code: keyToCode(key),
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers?.ctrl ?? false,
        altKey: modifiers?.alt ?? false,
        shiftKey: modifiers?.shift ?? false,
        metaKey: modifiers?.meta ?? false
      }
    } else {
      key = keyOrInit.key ?? ""
      init = {
        bubbles: true,
        cancelable: true,
        ...keyOrInit,
        code: keyOrInit.code ?? keyToCode(key)
      }
    }

    const event = new KeyboardEvent("keyup", init)
    return element.dispatchEvent(event)
  },

  /**
   * Dispatch keydown + keyup (a complete key press).
   */
  keyPress(element: Element, key: string, modifiers?: Modifiers): boolean {
    const down = this.keyDown(element, key, modifiers)
    const up = this.keyUp(element, key, modifiers)
    return down && up
  },

  /**
   * Click an element (TUI style: fires Enter key then click event).
   * This matches how EventRelay converts Enter key to click.
   */
  click(element: Element): boolean {
    // TUI click simulates Enter key press
    this.keyPress(element, "Enter")

    // Also dispatch actual click event for compatibility
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    })
    return element.dispatchEvent(clickEvent)
  },

  /**
   * Type text into an element character by character.
   * Supports special keys: {enter}, {backspace}, {tab}, {escape}
   */
  async type(element: Element, text: string): Promise<void> {
    let i = 0
    while (i < text.length) {
      const char = text[i]

      // Handle special keys like {enter}, {backspace}
      if (char === "{") {
        const end = text.indexOf("}", i)
        if (end !== -1) {
          const specialName = text.slice(i + 1, end).toLowerCase()
          const specialKey = SPECIAL_KEYS[specialName]
          if (specialKey) {
            // Handle backspace specially - remove character
            if (specialName === "backspace") {
              this.keyDown(element, specialKey)
              if (isInputElement(element)) {
                element.value = element.value.slice(0, -1)
                element.dispatchEvent(
                  createInputEvent("input", {
                    bubbles: true,
                    inputType: "deleteContentBackward"
                  })
                )
              }
              this.keyUp(element, specialKey)
            } else {
              this.keyPress(element, specialKey)
            }
            i = end + 1
            continue
          }
        }
      }

      // Regular character
      this.keyDown(element, char)

      // Update input value if applicable
      if (isInputElement(element)) {
        element.value += char
        element.dispatchEvent(
          createInputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: char
          })
        )
      }

      this.keyUp(element, char)

      // Small delay for async rendering
      await new Promise((r) => setTimeout(r, 0))
      i++
    }
  },

  /**
   * Tab to next/previous focusable element.
   */
  tab(options?: { shift?: boolean }): void {
    const doc = typeof document !== "undefined"
      ? document
      : (globalThis as any).document
    const activeElement = doc.activeElement ?? doc.body
    const shift = options?.shift ?? false

    // Fire Tab key event on current element
    this.keyPress(activeElement, "Tab", { shift })

    // Get focusable elements
    const focusables = getFocusableElements(doc.body)
    if (focusables.length === 0) return

    const currentIndex = focusables.indexOf(activeElement as HTMLElement)

    let nextIndex: number
    if (currentIndex === -1) {
      // Not currently on a focusable element
      nextIndex = shift ? focusables.length - 1 : 0
    } else if (shift) {
      nextIndex = currentIndex === 0 ? focusables.length - 1 : currentIndex - 1
    } else {
      nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1
    }

    const nextElement = focusables[nextIndex]
    if (nextElement) {
      nextElement.focus()
    }
  },

  /**
   * Focus an element.
   */
  focus(element: Element): void {
    ;(element as HTMLElement).focus()
    element.dispatchEvent(createFocusEvent("focus", { bubbles: false }))
    element.dispatchEvent(createFocusEvent("focusin", { bubbles: true }))
  },

  /**
   * Blur an element.
   */
  blur(element: Element): void {
    ;(element as HTMLElement).blur()
    element.dispatchEvent(createFocusEvent("blur", { bubbles: false }))
    element.dispatchEvent(createFocusEvent("focusout", { bubbles: true }))
  },

  /**
   * Change an input's value (@testing-library/react compatible).
   * Uses native value setter to work with React controlled inputs.
   */
  change(element: Element, init?: { target?: { value?: string } }): boolean {
    if (isInputElement(element) && init?.target?.value !== undefined) {
      const newValue = init.target.value

      // Get the native value setter to bypass React's value tracker
      const prototype = Object.getPrototypeOf(element)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      )?.set

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, newValue)
      } else {
        element.value = newValue
      }

      // Dispatch input event (what React listens to)
      element.dispatchEvent(
        createInputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: newValue
        })
      )

      // Also dispatch change event for completeness
      const changeEvent = new Event("change", { bubbles: true })
      return element.dispatchEvent(changeEvent)
    }
    return false
  },

  /**
   * Double-click an element.
   */
  dblClick(element: Element): boolean {
    const dblClickEvent = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true
    })
    return element.dispatchEvent(dblClickEvent)
  },

  /**
   * Scroll an element.
   */
  scroll(
    element: Element,
    options?: { target?: { scrollTop?: number; scrollLeft?: number } }
  ): void {
    if (options?.target) {
      if (options.target.scrollTop !== undefined) {
        ;(element as HTMLElement).scrollTop = options.target.scrollTop
      }
      if (options.target.scrollLeft !== undefined) {
        ;(element as HTMLElement).scrollLeft = options.target.scrollLeft
      }
    }
    element.dispatchEvent(new Event("scroll", { bubbles: false }))
  }
}
