/**
 * Event Relay: Bridges OpenTUI keyboard events to DOM events
 *
 * OpenTUI captures keyboard input from the terminal and emits KeyEvent objects.
 * React components expect DOM events (KeyboardEvent, MouseEvent, InputEvent).
 * This module translates TUI events into synthetic DOM events and dispatches
 * them to the appropriate DOM elements via happy-dom.
 *
 * Key mappings:
 * - Enter key -> click event on focused element
 * - Tab -> focus next focusable element
 * - Shift+Tab -> focus previous focusable element
 * - Character input -> keydown/keypress/input events for form fields
 * - Arrow keys -> keydown events (for custom navigation)
 */

import type { NodeMap, PositionedRenderable } from "./node-map.js"

export type { NodeMap }

/**
 * TUI KeyEvent interface - represents a keyboard event from the terminal.
 * This mirrors the KeyEvent type from @opentui/core.
 */
export interface TUIKeyEvent {
  /** Key name (e.g., "enter", "tab", "a", "space") */
  name: string
  /** Optional key code */
  code?: string
  /** Ctrl modifier pressed */
  ctrl: boolean
  /** Shift modifier pressed */
  shift: boolean
  /** Option/Alt modifier pressed */
  option: boolean
  /** Meta/Command modifier pressed */
  meta: boolean
  /** Whether this is a repeated keypress */
  repeated?: boolean
  /** Prevent default TUI handling */
  preventDefault(): void
}

/**
 * TUI KeyInput interface - the event emitter for keyboard events.
 */
export interface TUIKeyInput {
  on(event: "keypress", handler: (event: TUIKeyEvent) => void): void
  off(event: "keypress", handler: (event: TUIKeyEvent) => void): void
}

/**
 * TUI Renderer interface - the minimal renderer interface needed by EventRelay.
 */
export interface TUIRenderer {
  keyInput: TUIKeyInput
}

/**
 * Interface for a TUI scroll container (ScrollBoxRenderable).
 * Abstracts the scroll position and viewport dimensions.
 */
export interface ScrollContainer {
  scrollTop: number
  scrollTo?(position: number | { x: number; y: number }): void
  viewport?: { height: number; width: number }
}

/**
 * Interface for the event relay system.
 * Bridges TUI keyboard/mouse events to synthetic DOM events.
 */
export interface EventRelay {
  /** Start relaying events from renderer to document */
  attach(renderer: TUIRenderer, document: Document, nodeMap: NodeMap): void

  /** Stop relaying events */
  detach(): void

  /** Activate focus trap within a container. Tab cycles only within container. */
  activateFocusTrap(container: Element): void

  /** Deactivate focus trap and restore previous focus */
  deactivateFocusTrap(): void

  /** Set the scroll container for auto-scrolling on focus change */
  setScrollContainer(domContainer: Element, tuiScrollBox: ScrollContainer): void
}

/** Options for creating an event relay */
export interface EventRelayOptions {
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Map TUI key names to DOM key values.
 * TUI uses names like "enter", "backspace" while DOM uses "Enter", "Backspace".
 */
const TUI_TO_DOM_KEY: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  backspace: "Backspace",
  delete: "Delete",
  tab: "Tab",
  escape: "Escape",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  space: " ",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown"
}

/**
 * Map TUI key names to DOM key codes.
 * Used for the deprecated but still-used keyCode property.
 */
const TUI_TO_DOM_KEYCODE: Record<string, number> = {
  enter: 13,
  return: 13,
  backspace: 8,
  delete: 46,
  tab: 9,
  escape: 27,
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  space: 32,
  home: 36,
  end: 35,
  pageup: 33,
  pagedown: 34
}

/**
 * Creates an EventRelay instance.
 *
 * @example
 * ```ts
 * const relay = createEventRelay({ debug: true })
 * relay.attach(renderer, document, nodeMap)
 * // Events now flow: TUI keypress -> DOM keydown/click/input
 * relay.detach() // Stop relaying
 * ```
 */
export function createEventRelay(options: EventRelayOptions = {}): EventRelay {
  const { debug = false } = options

  let attached = false
  let currentRenderer: TUIRenderer | null = null
  let currentDocument: Document | null = null
  let currentNodeMap: NodeMap | null = null
  let keypressHandler: ((event: TUIKeyEvent) => void) | null = null

  // Focus trap state
  let trapContainer: Element | null = null
  let preTrapFocus: Element | null = null

  // Scroll container state
  let _scrollDomContainer: Element | null = null
  let scrollTuiContainer: ScrollContainer | null = null

  const log = debug ? console.log.bind(console, "[EventRelay]") : () => {}

  /**
   * Get the currently focused element in the document.
   * Falls back to document.body if no element is focused.
   */
  function getFocusedElement(): Element {
    return currentDocument?.activeElement ?? currentDocument?.body ?? null!
  }

  /**
   * Check if an element is visible (not hidden via display:none).
   * Walks up the ancestor chain to check if any parent is hidden.
   */
  function isElementVisible(el: Element): boolean {
    let current: Element | null = el
    while (current) {
      const style = (current as HTMLElement).style
      if (style?.display === "none") return false
      current = current.parentElement
    }
    return true
  }

  /**
   * Get all focusable elements in document order.
   * When focus trap is active, only returns elements within the trap container.
   * Hidden elements (display:none) are excluded from navigation.
   *
   * Radio groups follow roving tabindex pattern:
   * - Only include ONE radio per group (checked one, or tabindex=0, or first)
   * - Arrow keys navigate within group (handled separately)
   */
  function getFocusableElements(): Array<Element> {
    if (!currentDocument) return []

    const selector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])"
    ].join(", ")

    // When focus trap is active, only search within the trap container
    const searchRoot = trapContainer ?? currentDocument
    const allFocusable = Array.from(searchRoot.querySelectorAll(selector)).filter(
      isElementVisible
    ) // Filter out hidden elements

    // Filter radios: only include one per group (roving tabindex pattern)
    const radioGroups = new Map<string, Array<HTMLInputElement>>()
    const result: Array<Element> = []

    for (const el of allFocusable) {
      if (isRadioInput(el)) {
        const radio = el as HTMLInputElement
        const name = radio.name || `__unnamed_${radio.id || "radio"}`
        if (!radioGroups.has(name)) {
          radioGroups.set(name, [])
        }
        radioGroups.get(name)!.push(radio)
      } else {
        result.push(el)
      }
    }

    // For each radio group, add only the appropriate one to focusables
    for (const [, radios] of radioGroups) {
      const representativeRadio = getRadioGroupTabTarget(radios)
      if (representativeRadio) {
        result.push(representativeRadio)
      }
    }

    // Sort by document order
    // Use numeric constants directly since Node may not be globally defined
    // DOCUMENT_POSITION_FOLLOWING = 4, DOCUMENT_POSITION_PRECEDING = 2
    return result.sort((a, b) => {
      const position = a.compareDocumentPosition(b)
      if (position & 4) return -1 // DOCUMENT_POSITION_FOLLOWING
      if (position & 2) return 1 // DOCUMENT_POSITION_PRECEDING
      return 0
    })
  }

  /**
   * Check if element is a radio input.
   */
  function isRadioInput(el: Element): el is HTMLInputElement {
    return (
      el.tagName.toLowerCase() === "input" &&
      (el as HTMLInputElement).type === "radio"
    )
  }

  /**
   * Get the radio that should receive focus when tabbing into a group.
   * Priority: checked radio > tabindex=0 radio > first radio
   */
  function getRadioGroupTabTarget(
    radios: Array<HTMLInputElement>
  ): HTMLInputElement | null {
    if (radios.length === 0) return null

    // First priority: checked radio
    const checked = radios.find((r) => r.checked)
    if (checked) return checked

    // Second priority: radio with tabindex="0"
    const withTabindex0 = radios.find((r) => r.tabIndex === 0)
    if (withTabindex0) return withTabindex0

    // Fallback: first radio
    return radios[0] ?? null
  }

  /**
   * Get all radios in the same group as the given radio.
   */
  function getRadioGroup(radio: HTMLInputElement): Array<HTMLInputElement> {
    if (!currentDocument || !radio.name) return [radio]

    return Array.from(
      currentDocument.querySelectorAll(
        `input[type="radio"][name="${radio.name}"]`
      )
    ) as Array<HTMLInputElement>
  }

  /**
   * Move focus within a radio group (roving tabindex pattern).
   * Also updates checked state and tabindex.
   */
  function moveRadioFocus(
    radio: HTMLInputElement,
    direction: "next" | "previous"
  ): void {
    const radios = getRadioGroup(radio)
    if (radios.length <= 1) return

    const currentIndex = radios.indexOf(radio)
    if (currentIndex === -1) return

    let newIndex: number
    if (direction === "next") {
      newIndex = (currentIndex + 1) % radios.length
    } else {
      newIndex = (currentIndex - 1 + radios.length) % radios.length
    }

    const newRadio = radios[newIndex]
    if (!newRadio) return

    // Update tabindex: old gets -1, new gets 0
    radio.tabIndex = -1
    newRadio.tabIndex = 0

    // Check the new radio
    newRadio.checked = true

    // Focus the new radio
    newRadio.focus()

    // Dispatch change event
    const win = currentDocument?.defaultView
    if (win) {
      const changeEvent = new win.Event("change", { bubbles: true })
      newRadio.dispatchEvent(changeEvent)
    }

    log(`Radio focus ${direction}: ${newRadio.id || "(no id)"}`)
  }

  /**
   * Activate focus trap within a container.
   * Stores current focused element to restore later.
   */
  function activateTrap(container: Element): void {
    preTrapFocus = getFocusedElement()
    trapContainer = container
    log(`Focus trap activated: ${container.id || container.tagName}`)
  }

  /**
   * Deactivate focus trap and restore previous focus.
   */
  function deactivateTrap(): void {
    trapContainer = null
    if (
      preTrapFocus &&
      typeof (preTrapFocus as HTMLElement).focus === "function"
    ) {
      log(
        `Focus trap deactivated, restoring focus to: ${preTrapFocus.id || preTrapFocus.tagName}`
      )
      ;(preTrapFocus as HTMLElement).focus()
    }
    preTrapFocus = null
  }

  /**
   * Move focus to the next or previous focusable element.
   */
  function moveFocus(direction: "next" | "previous"): void {
    const focusables = getFocusableElements()
    if (focusables.length === 0) return

    const current = getFocusedElement()
    const currentIndex = focusables.indexOf(current)

    let nextIndex: number
    if (currentIndex === -1) {
      nextIndex = direction === "next" ? 0 : focusables.length - 1
    } else if (direction === "next") {
      nextIndex = (currentIndex + 1) % focusables.length
    } else {
      nextIndex = (currentIndex - 1 + focusables.length) % focusables.length
    }

    const nextElement = focusables[nextIndex] as HTMLElement
    if (nextElement && typeof nextElement.focus === "function") {
      log(
        `Focus ${direction}: ${nextElement.tagName}#${nextElement.id || "(no id)"}`
      )
      nextElement.focus()

      // Scroll into view if we have a scroll container
      scrollIntoView(nextElement)
    }
  }

  /**
   * Scroll the focused element into view within the TUI scroll container.
   *
   * Since happy-dom's scrollIntoView() is a no-op, we calculate scroll offset
   * using the TUI renderable's position from the nodeMap.
   *
   * For scroll calculations, we need the element's position within the scroll content area.
   * OpenTUI's ScrollBoxRenderable adds children to its `content` renderable, so:
   * - `_y` is position within immediate parent
   * - We accumulate `_y` values up the parent chain until we reach the scroll content
   *
   * The scroll content is identified by checking if a parent has `_translateY` property
   * (ContentRenderable applies translateY for scrolling).
   */
  function scrollIntoView(element: Element): void {
    if (!scrollTuiContainer || !currentNodeMap) return

    // Get the TUI renderable for this element
    const renderable = currentNodeMap.getRenderable(element) as
      | PositionedRenderable
      | undefined
    if (!renderable) {
      log(
        `scrollIntoView: no renderable for ${(element as HTMLElement).id || element.tagName}`
      )
      return
    }

    const viewportHeight = scrollTuiContainer.viewport?.height ?? 0
    if (viewportHeight <= 0) {
      log(`scrollIntoView: viewport height is 0, skipping`)
      return
    }

    // Compute element's position within the scroll content by summing _y up the parent chain.
    // For test mocks that don't have _y, fall back to y directly.
    const rawRenderable = renderable as PositionedRenderable & { _y?: number }
    const usesInternalY = rawRenderable._y !== undefined

    let elementTop = 0

    if (usesInternalY) {
      // Real OpenTUI renderable - accumulate _y values up the chain
      // We stop when we reach a ContentRenderable (has _translateY for scroll offset)
      // or when we run out of parents
      let current: PositionedRenderable | null = renderable
      const maxDepth = 20 // Safety limit

      for (let i = 0; i < maxDepth && current; i++) {
        const rawCurrent = current as PositionedRenderable & {
          _y?: number
          _translateY?: number
        }
        elementTop += rawCurrent._y ?? 0

        // Check if this is the scroll content (ContentRenderable has _translateY for scroll)
        // ContentRenderable's _translateY represents the scroll offset, so we stop here
        if (rawCurrent._translateY !== undefined) {
          // Don't include _translateY in position - that's the scroll offset
          break
        }

        current = current.parent
      }
    } else {
      // Test mock - use y directly (already represents position in scroll content)
      elementTop = renderable.y
    }

    const elementBottom = elementTop + renderable.height

    const scrollTop = scrollTuiContainer.scrollTop
    const viewportTop = scrollTop
    const viewportBottom = scrollTop + viewportHeight

    log(
      `scrollIntoView: element y=${elementTop}-${elementBottom}, viewport=${viewportTop}-${viewportBottom}, scrollTop=${scrollTop}`
    )

    // Element is below viewport - scroll down
    if (elementBottom > viewportBottom) {
      const newScrollTop = elementBottom - viewportHeight
      log(`scrollIntoView: scrolling down to ${newScrollTop}`)
      if (scrollTuiContainer.scrollTo) {
        scrollTuiContainer.scrollTo(newScrollTop)
      } else {
        scrollTuiContainer.scrollTop = newScrollTop
      }
      return
    }

    // Element is above viewport - scroll up
    if (elementTop < viewportTop) {
      log(`scrollIntoView: scrolling up to ${elementTop}`)
      if (scrollTuiContainer.scrollTo) {
        scrollTuiContainer.scrollTo(elementTop)
      } else {
        scrollTuiContainer.scrollTop = elementTop
      }
      return
    }

    log(`scrollIntoView: element already visible, no scroll needed`)
  }

  /**
   * Convert a TUI KeyEvent to DOM key value.
   */
  function getDOMKey(tuiEvent: TUIKeyEvent): string {
    const name = tuiEvent.name.toLowerCase()
    return TUI_TO_DOM_KEY[name] ?? tuiEvent.name
  }

  /**
   * Convert a TUI KeyEvent to DOM keyCode (deprecated but still used).
   */
  function getDOMKeyCode(tuiEvent: TUIKeyEvent): number {
    const name = tuiEvent.name.toLowerCase()
    if (TUI_TO_DOM_KEYCODE[name]) {
      return TUI_TO_DOM_KEYCODE[name]
    }
    // For printable characters, use char code
    if (tuiEvent.name.length === 1) {
      return tuiEvent.name.charCodeAt(0)
    }
    return 0
  }

  /**
   * Create and dispatch a KeyboardEvent to the target element.
   * Returns the event object so caller can check defaultPrevented.
   */
  function dispatchKeyboardEvent(
    target: Element,
    type: "keydown" | "keyup" | "keypress",
    tuiEvent: TUIKeyEvent
  ): KeyboardEvent | null {
    const key = getDOMKey(tuiEvent)
    const keyCode = getDOMKeyCode(tuiEvent)

    // Use the window from the document for proper event construction
    const win = currentDocument?.defaultView
    if (!win) return null

    const event = new win.KeyboardEvent(type, {
      key,
      code: tuiEvent.code ?? key,
      keyCode,
      which: keyCode,
      ctrlKey: tuiEvent.ctrl,
      altKey: tuiEvent.option || tuiEvent.meta,
      shiftKey: tuiEvent.shift,
      metaKey: tuiEvent.meta,
      repeat: tuiEvent.repeated ?? false,
      bubbles: true,
      cancelable: true
    })

    log(`Dispatch ${type}: key="${key}" target=${target.tagName}`)
    target.dispatchEvent(event)
    return event as unknown as KeyboardEvent
  }

  /**
   * Create and dispatch a click (MouseEvent) to the target element.
   */
  function dispatchClick(target: Element): boolean {
    const win = currentDocument?.defaultView
    if (!win) return false

    const event = new win.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0
    })

    log(`Dispatch click: target=${target.tagName}`)
    return target.dispatchEvent(event)
  }

  /**
   * Create and dispatch an InputEvent for text input.
   */
  function dispatchInputEvent(target: Element, data: string): boolean {
    const win = currentDocument?.defaultView
    if (!win) return false

    const event = new win.InputEvent("input", {
      data,
      inputType: "insertText",
      bubbles: true,
      cancelable: true
    })

    log(`Dispatch input: data="${data}" target=${target.tagName}`)
    return target.dispatchEvent(event)
  }

  /**
   * Check if an element is a text input (input, textarea).
   */
  function isTextInput(
    element: Element
  ): element is HTMLInputElement | HTMLTextAreaElement {
    const tagName = element.tagName.toLowerCase()
    if (tagName === "textarea") return true
    if (tagName === "input") {
      const type = (element as HTMLInputElement).type?.toLowerCase()
      return (
        !type ||
        ["text", "password", "email", "url", "search", "tel", "number"].includes(
          type
        )
      )
    }
    return false
  }

  /**
   * Check if an input element supports selection APIs (selectionStart/End).
   * Per HTML spec, only text, search, url, tel, password support selection.
   * email and number do NOT support selection APIs.
   */
  function supportsSelection(
    element: HTMLInputElement | HTMLTextAreaElement
  ): boolean {
    if (element.tagName.toLowerCase() === "textarea") return true
    const type = (element as HTMLInputElement).type?.toLowerCase()
    return !type || ["text", "search", "url", "tel", "password"].includes(type)
  }

  /**
   * Get selection position from input, with fallback for unsupported types.
   * Returns [selectionStart, selectionEnd] or [value.length, value.length] if unsupported.
   */
  function getSelectionPosition(
    element: HTMLInputElement | HTMLTextAreaElement
  ): [number, number] {
    const currentValue = element.value ?? ""
    if (!supportsSelection(element)) {
      return [currentValue.length, currentValue.length]
    }
    try {
      const start = element.selectionStart ?? currentValue.length
      const end = element.selectionEnd ?? currentValue.length
      return [start, end]
    } catch {
      // Fallback if selection access fails for any reason
      return [currentValue.length, currentValue.length]
    }
  }

  /**
   * Set selection position on input, silently ignoring unsupported types.
   */
  function setSelectionPosition(
    element: HTMLInputElement | HTMLTextAreaElement,
    start: number,
    end: number
  ): void {
    if (!supportsSelection(element)) return
    try {
      element.selectionStart = start
      element.selectionEnd = end
    } catch {
      // Ignore errors for unsupported input types
    }
  }

  /**
   * Handle accesskey activation.
   * Finds element with matching accesskey attribute and focuses or clicks it.
   * Returns true if an accesskey was handled.
   */
  function handleAccesskey(key: string): boolean {
    if (!currentDocument) return false

    // Case-insensitive search for accesskey attribute
    const normalizedKey = key.toLowerCase()
    const element = currentDocument.querySelector(
      `[accesskey="${normalizedKey}"], [accesskey="${normalizedKey.toUpperCase()}"]`
    )

    if (!element) return false

    const htmlElement = element as HTMLElement
    const tagName = element.tagName.toLowerCase()

    log(
      `Accesskey "${key}" matched: <${tagName} id="${htmlElement.id || "(no id)"}">`
    )

    // Labels with for= attribute: focus the associated input instead
    if (tagName === "label") {
      const forId = element.getAttribute("for")
      if (forId) {
        const targetElement = currentDocument.getElementById(forId)
        if (
          targetElement &&
          typeof (targetElement as HTMLElement).focus === "function"
        ) {
          ;(targetElement as HTMLElement).focus()
          return true
        }
      }
    }

    // Buttons and links: click them
    if (tagName === "button" || tagName === "a") {
      htmlElement.click()
      return true
    }

    // Inputs, selects, textareas: focus them
    if (tagName === "input" || tagName === "select" || tagName === "textarea") {
      htmlElement.focus()
      return true
    }

    // Fallback: try focus for any focusable element
    if (typeof htmlElement.focus === "function") {
      htmlElement.focus()
      return true
    }

    return false
  }

  /**
   * Find word boundary moving backward from end of string.
   * Returns index where word starts.
   * Skips trailing whitespace, then finds start of word.
   */
  function findWordBoundaryBackward(str: string): number {
    let pos = str.length
    // Skip trailing whitespace
    while (pos > 0 && /\s/.test(str[pos - 1]!)) {
      pos--
    }
    // Find start of word (non-whitespace characters)
    while (pos > 0 && !/\s/.test(str[pos - 1]!)) {
      pos--
    }
    return pos
  }

  /**
   * Find word boundary moving forward from start of string.
   * Returns offset from start where word ends.
   * Finds end of current word, then skips trailing whitespace.
   */
  function findWordBoundaryForward(str: string): number {
    let pos = 0
    // Skip any leading whitespace
    while (pos < str.length && /\s/.test(str[pos]!)) {
      pos++
    }
    // Find end of word (non-whitespace characters)
    while (pos < str.length && !/\s/.test(str[pos]!)) {
      pos++
    }
    return pos
  }

  /**
   * Handle a TUI keypress event.
   * This is the main entry point for event relay.
   *
   * Key principle: Dispatch DOM keydown FIRST, then check defaultPrevented.
   * This allows DOM event handlers to preventDefault() and block EventRelay's
   * default behaviors (focus trap release, tab navigation, etc.).
   */
  function handleKeypress(tuiEvent: TUIKeyEvent): void {
    if (!currentDocument) return

    const target = getFocusedElement()
    if (!target) return

    log(
      `TUI keypress: name="${tuiEvent.name}" ctrl=${tuiEvent.ctrl} shift=${tuiEvent.shift} option=${tuiEvent.option}`
    )

    const name = tuiEvent.name.toLowerCase()

    // Dispatch keydown FIRST - let DOM handlers have first crack
    const keydownEvent = dispatchKeyboardEvent(target, "keydown", tuiEvent)
    const prevented = keydownEvent?.defaultPrevented ?? false

    if (prevented) {
      log(`keydown was prevented by DOM handler`)
      tuiEvent.preventDefault()
      return
    }

    // Handle Escape to release focus trap (only if not prevented by DOM)
    if (name === "escape" && trapContainer) {
      deactivateTrap()
      tuiEvent.preventDefault()
      return
    }

    // Handle accesskey: Alt/Option + letter focuses/clicks element with matching accesskey
    // Terminal sends Alt as either:
    // 1. option=true (modern terminal with modifyOtherKeys or Kitty keyboard)
    // 2. meta=true (traditional ESC prefix: \x1b + letter)
    // Check both to support all terminal types
    const hasAltModifier = tuiEvent.option || tuiEvent.meta
    if (hasAltModifier && tuiEvent.name.length === 1) {
      if (handleAccesskey(tuiEvent.name)) {
        tuiEvent.preventDefault()
        return
      }
    }

    // Handle Tab navigation
    if (name === "tab") {
      if (tuiEvent.shift) {
        moveFocus("previous")
      } else {
        moveFocus("next")
      }
      tuiEvent.preventDefault()
      return
    }

    // Handle Arrow keys for radio group navigation (roving tabindex)
    if (isRadioInput(target)) {
      if (name === "down" || name === "right") {
        moveRadioFocus(target as HTMLInputElement, "next")
        tuiEvent.preventDefault()
        return
      }
      if (name === "up" || name === "left") {
        moveRadioFocus(target as HTMLInputElement, "previous")
        tuiEvent.preventDefault()
        return
      }
    }

    // Handle Enter -> click for buttons/links/selects (not for text inputs)
    if (name === "enter" || name === "return") {
      if (!isTextInput(target)) {
        dispatchClick(target)
      }
      return
    }

    // Handle Space -> click for buttons/selects/checkboxes (not for text inputs)
    // In browsers, Space activates buttons, toggles checkboxes, and opens selects
    if (name === "space") {
      const tagName = target.tagName.toLowerCase()
      const inputType = (target as HTMLInputElement).type?.toLowerCase()

      // Space on select should dispatch click (opens native dropdown in browsers)
      if (tagName === "select") {
        dispatchClick(target)
        tuiEvent.preventDefault()
        return
      }

      // Space on button should dispatch click
      if (tagName === "button") {
        dispatchClick(target)
        tuiEvent.preventDefault()
        return
      }

      // Space on checkbox dispatches click (native checkbox handles toggle)
      if (tagName === "input" && inputType === "checkbox") {
        dispatchClick(target)
        tuiEvent.preventDefault()
        return
      }

      // Space on other non-text inputs falls through to character handling
    }

    // Handle readline shortcuts for text fields
    if (isTextInput(target)) {
      const inputElement = target as HTMLInputElement | HTMLTextAreaElement
      const currentValue = inputElement.value ?? ""
      const [selStart] = getSelectionPosition(inputElement)

      // Ctrl-based readline shortcuts
      if (tuiEvent.ctrl) {
        // Ctrl+A: jump to start of line
        if (name === "a") {
          setSelectionPosition(inputElement, 0, 0)
          return
        }

        // Ctrl+E: jump to end of line
        if (name === "e") {
          const len = currentValue.length
          setSelectionPosition(inputElement, len, len)
          return
        }

        // Ctrl+F: forward one character
        if (name === "f") {
          const newPos = Math.min(selStart + 1, currentValue.length)
          setSelectionPosition(inputElement, newPos, newPos)
          return
        }

        // Ctrl+B: backward one character
        if (name === "b") {
          const newPos = Math.max(selStart - 1, 0)
          setSelectionPosition(inputElement, newPos, newPos)
          return
        }

        // Ctrl+D: delete character forward
        if (name === "d") {
          if (selStart < currentValue.length) {
            inputElement.value = currentValue.slice(0, selStart) + currentValue.slice(selStart + 1)
            setSelectionPosition(inputElement, selStart, selStart)
            dispatchInputEvent(target, "")
          }
          return
        }

        // Ctrl+W: delete word backward
        if (name === "w") {
          const beforeCursor = currentValue.slice(0, selStart)
          // Find start of previous word (skip trailing spaces, then find word start)
          const wordStart = findWordBoundaryBackward(beforeCursor)
          inputElement.value = currentValue.slice(0, wordStart) + currentValue.slice(selStart)
          setSelectionPosition(inputElement, wordStart, wordStart)
          dispatchInputEvent(target, "")
          return
        }

        // Ctrl+U: kill to start of line
        if (name === "u") {
          inputElement.value = currentValue.slice(selStart)
          setSelectionPosition(inputElement, 0, 0)
          dispatchInputEvent(target, "")
          return
        }

        // Ctrl+K: kill to end of line
        if (name === "k") {
          inputElement.value = currentValue.slice(0, selStart)
          setSelectionPosition(inputElement, selStart, selStart)
          dispatchInputEvent(target, "")
          return
        }
      }

      // Alt/Option-based readline shortcuts
      const hasAlt = tuiEvent.option || tuiEvent.meta
      if (hasAlt) {
        // Alt+F: forward one word
        if (name === "f") {
          const afterCursor = currentValue.slice(selStart)
          const wordEnd = findWordBoundaryForward(afterCursor)
          const newPos = selStart + wordEnd
          setSelectionPosition(inputElement, newPos, newPos)
          return
        }

        // Alt+B: backward one word
        if (name === "b") {
          const beforeCursor = currentValue.slice(0, selStart)
          const wordStart = findWordBoundaryBackward(beforeCursor)
          setSelectionPosition(inputElement, wordStart, wordStart)
          return
        }

        // Alt+D: delete word forward
        if (name === "d") {
          const afterCursor = currentValue.slice(selStart)
          const wordEnd = findWordBoundaryForward(afterCursor)
          inputElement.value = currentValue.slice(0, selStart) +
            currentValue.slice(selStart + wordEnd)
          setSelectionPosition(inputElement, selStart, selStart)
          dispatchInputEvent(target, "")
          return
        }
      }
    }

    // Handle character input for text fields
    // Determine the actual character to insert
    let charToInsert: string | null = null

    if (name === "space") {
      // "space" key maps to " " character
      charToInsert = " "
    } else if (tuiEvent.name.length === 1 && !tuiEvent.ctrl && !tuiEvent.meta) {
      // Single printable character, apply shift for uppercase
      charToInsert = tuiEvent.shift ? tuiEvent.name.toUpperCase() : tuiEvent.name
    }

    if (isTextInput(target) && charToInsert !== null) {
      const inputElement = target as HTMLInputElement | HTMLTextAreaElement
      const currentValue = inputElement.value ?? ""

      // Get cursor position, default to end if not set
      // Use helper to handle inputs that don't support selection (email, number)
      const [selStart, selEnd] = getSelectionPosition(inputElement)

      // Insert character at cursor position (replaces selection if any)
      inputElement.value = currentValue.slice(0, selStart) +
        charToInsert +
        currentValue.slice(selEnd)

      // Move cursor after the inserted character
      const newPos = selStart + charToInsert.length
      setSelectionPosition(inputElement, newPos, newPos)

      // Dispatch input event
      dispatchInputEvent(target, charToInsert)
      return
    }

    // Handle backspace for text fields
    if (name === "backspace" && isTextInput(target)) {
      const inputElement = target as HTMLInputElement | HTMLTextAreaElement
      const currentValue = inputElement.value ?? ""
      if (currentValue.length > 0) {
        inputElement.value = currentValue.slice(0, -1)

        // Dispatch input event with deleteContentBackward
        const win = currentDocument?.defaultView
        if (win) {
          const event = new win.InputEvent("input", {
            inputType: "deleteContentBackward",
            bubbles: true,
            cancelable: true
          })
          target.dispatchEvent(event)
        }
      }
      return
    }
  }

  return {
    attach(renderer: TUIRenderer, document: Document, nodeMap: NodeMap): void {
      if (attached) {
        this.detach()
      }

      currentRenderer = renderer
      currentDocument = document
      currentNodeMap = nodeMap
      attached = true

      // Subscribe to TUI keypress events
      keypressHandler = handleKeypress
      renderer.keyInput.on("keypress", keypressHandler)

      log("Attached to renderer")
    },

    detach(): void {
      if (!attached) return

      if (currentRenderer && keypressHandler) {
        currentRenderer.keyInput.off("keypress", keypressHandler)
      }

      currentRenderer = null
      currentDocument = null
      currentNodeMap = null
      keypressHandler = null
      attached = false
      trapContainer = null
      preTrapFocus = null
      _scrollDomContainer = null
      scrollTuiContainer = null

      log("Detached from renderer")
    },

    activateFocusTrap(container: Element): void {
      activateTrap(container)
    },

    deactivateFocusTrap(): void {
      deactivateTrap()
    },

    setScrollContainer(
      domContainer: Element,
      tuiScrollBox: ScrollContainer
    ): void {
      _scrollDomContainer = domContainer
      scrollTuiContainer = tuiScrollBox
      log(`Scroll container set: ${domContainer.id || domContainer.tagName}`)
      void _scrollDomContainer // Reserved for future scroll-to-element DOM operations
    }
  }
}

export default createEventRelay
