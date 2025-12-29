import { Window } from "happy-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createEventRelay,
  type EventRelay,
  type ScrollContainer,
  type TUIKeyEvent,
  type TUIRenderer
} from "../src/bridge/event-relay.js"
import { createNodeMap, type NodeMap } from "../src/bridge/node-map.js"

/**
 * Creates a mock TUI key event
 */
function createKeyEvent(
  name: string,
  opts: Partial<TUIKeyEvent> = {}
): TUIKeyEvent {
  return {
    name,
    ctrl: false,
    shift: false,
    option: false,
    meta: false,
    preventDefault: vi.fn(),
    ...opts
  }
}

/**
 * Creates a mock TUI renderer with key input emitter
 */
function createMockRenderer(): TUIRenderer & {
  emit: (event: TUIKeyEvent) => void
} {
  const handlers: Array<(event: TUIKeyEvent) => void> = []
  return {
    keyInput: {
      on: (event: "keypress", handler: (event: TUIKeyEvent) => void) => {
        handlers.push(handler)
      },
      off: (event: "keypress", handler: (event: TUIKeyEvent) => void) => {
        const idx = handlers.indexOf(handler)
        if (idx >= 0) handlers.splice(idx, 1)
      }
    },
    emit: (event: TUIKeyEvent) => {
      handlers.forEach((h) => h(event))
    }
  }
}

describe("EventRelay", () => {
  let window: Window
  let document: Document
  let relay: EventRelay
  let renderer: ReturnType<typeof createMockRenderer>
  let nodeMap: NodeMap

  beforeEach(() => {
    window = new Window()
    document = window.document
    relay = createEventRelay()
    renderer = createMockRenderer()
    nodeMap = createNodeMap()
  })

  afterEach(() => {
    relay.detach()
    window.close()
  })

  describe("attach/detach", () => {
    it("attaches to renderer and receives keypress events", () => {
      document.body.innerHTML = "<button id=\"btn\">Click me</button>"
      const button = document.getElementById("btn")!
      button.focus()

      relay.attach(renderer, document as unknown as Document, nodeMap)

      const clickHandler = vi.fn()
      button.addEventListener("click", clickHandler)

      // Enter triggers click on button
      renderer.emit(createKeyEvent("enter"))
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it("stops receiving events after detach", () => {
      document.body.innerHTML = "<button id=\"btn\">Click me</button>"
      const button = document.getElementById("btn")!
      button.focus()

      relay.attach(renderer, document as unknown as Document, nodeMap)
      relay.detach()

      const clickHandler = vi.fn()
      button.addEventListener("click", clickHandler)

      renderer.emit(createKeyEvent("enter"))
      expect(clickHandler).not.toHaveBeenCalled()
    })
  })

  describe("event translation", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("translates TUI enter to DOM click on button", () => {
      document.body.innerHTML = "<button id=\"btn\">Click</button>"
      const button = document.getElementById("btn")!
      button.focus()

      const clickHandler = vi.fn()
      button.addEventListener("click", clickHandler)

      renderer.emit(createKeyEvent("enter"))
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it("translates TUI space to DOM click on button", () => {
      document.body.innerHTML = "<button id=\"btn\">Click</button>"
      const button = document.getElementById("btn")!
      button.focus()

      const clickHandler = vi.fn()
      button.addEventListener("click", clickHandler)

      renderer.emit(createKeyEvent("space"))
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it("translates TUI space to DOM click on checkbox", () => {
      document.body.innerHTML = "<input type=\"checkbox\" id=\"check\" />"
      const checkbox = document.getElementById("check")! as HTMLInputElement
      checkbox.focus()

      expect(checkbox.checked).toBe(false)
      renderer.emit(createKeyEvent("space"))
      // The click event toggles checkbox
      expect(checkbox.checked).toBe(true)
    })

    it("dispatches keydown events for all keys", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")!
      input.focus()

      const keydownHandler = vi.fn()
      input.addEventListener("keydown", keydownHandler)

      renderer.emit(createKeyEvent("a"))
      expect(keydownHandler).toHaveBeenCalledTimes(1)

      const event = keydownHandler.mock.calls[0][0] as KeyboardEvent
      expect(event.key).toBe("a")
    })

    it("maps TUI key names to DOM key values", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")!
      input.focus()

      const keydownHandler = vi.fn()
      input.addEventListener("keydown", keydownHandler)

      renderer.emit(createKeyEvent("up"))

      const event = keydownHandler.mock.calls[0][0] as KeyboardEvent
      expect(event.key).toBe("ArrowUp")
    })

    it("passes modifier keys to DOM events", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")!
      input.focus()

      const keydownHandler = vi.fn()
      input.addEventListener("keydown", keydownHandler)

      renderer.emit(createKeyEvent("a", { ctrl: true, shift: true }))

      const event = keydownHandler.mock.calls[0][0] as KeyboardEvent
      expect(event.ctrlKey).toBe(true)
      expect(event.shiftKey).toBe(true)
    })
  })

  describe("focus navigation (Tab)", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("Tab moves focus to next focusable element", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
        <button id="btn3">Third</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn2 = document.getElementById("btn2")!
      btn1.focus()

      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(btn2)
    })

    it("Shift+Tab moves focus to previous focusable element", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
        <button id="btn3">Third</button>
      `
      const btn2 = document.getElementById("btn2")!
      const btn1 = document.getElementById("btn1")!
      btn2.focus()

      renderer.emit(createKeyEvent("tab", { shift: true }))
      expect(document.activeElement).toBe(btn1)
    })

    it("Tab wraps around to first element from last", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn2 = document.getElementById("btn2")!
      btn2.focus()

      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(btn1)
    })

    it("Tab skips disabled elements", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2" disabled>Second</button>
        <button id="btn3">Third</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn3 = document.getElementById("btn3")!
      btn1.focus()

      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(btn3)
    })

    it("Tab skips hidden elements (display:none)", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2" style="display: none">Second</button>
        <button id="btn3">Third</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn3 = document.getElementById("btn3")!
      btn1.focus()

      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(btn3)
    })

    it("calls preventDefault on TUI event for Tab", () => {
      document.body.innerHTML = "<button id=\"btn\">Button</button>"
      document.getElementById("btn")!.focus()

      const event = createKeyEvent("tab")
      renderer.emit(event)
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe("focus trap", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("Tab only cycles within trap container", () => {
      document.body.innerHTML = `
        <button id="outside">Outside</button>
        <div id="dialog">
          <button id="inside1">Inside 1</button>
          <button id="inside2">Inside 2</button>
        </div>
      `
      const dialog = document.getElementById("dialog")!
      const inside1 = document.getElementById("inside1")!
      const inside2 = document.getElementById("inside2")!

      relay.activateFocusTrap(dialog)
      inside2.focus()

      // Tab should wrap to first element inside dialog, not outside button
      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(inside1)
    })

    it("Escape deactivates focus trap and restores previous focus", () => {
      document.body.innerHTML = `
        <button id="outside">Outside</button>
        <div id="dialog">
          <button id="inside">Inside</button>
        </div>
      `
      const outside = document.getElementById("outside")!
      const dialog = document.getElementById("dialog")!
      const inside = document.getElementById("inside")!

      outside.focus()
      relay.activateFocusTrap(dialog)
      inside.focus()

      renderer.emit(createKeyEvent("escape"))
      expect(document.activeElement).toBe(outside)
    })

    it("deactivateFocusTrap restores normal tab navigation", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <div id="dialog">
          <button id="inside">Inside</button>
        </div>
        <button id="btn2">Second</button>
      `
      const btn1 = document.getElementById("btn1")!
      void document.getElementById("btn2")!
      const dialog = document.getElementById("dialog")!

      btn1.focus()
      relay.activateFocusTrap(dialog)
      relay.deactivateFocusTrap()

      btn1.focus()
      renderer.emit(createKeyEvent("tab"))
      // Should now be able to tab to elements outside dialog
      // The inside button is the next focusable element
      expect(document.activeElement?.id).toBe("inside")
    })
  })

  describe("radio group navigation (roving tabindex)", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("Tab focuses only one radio in a group", () => {
      document.body.innerHTML = `
        <button id="before">Before</button>
        <input type="radio" name="choice" id="r1" value="1" />
        <input type="radio" name="choice" id="r2" value="2" />
        <input type="radio" name="choice" id="r3" value="3" />
        <button id="after">After</button>
      `
      const before = document.getElementById("before")!
      const r1 = document.getElementById("r1")!
      const after = document.getElementById("after")!
      before.focus()

      // Tab should focus first radio (or checked one)
      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(r1)

      // Next tab should skip rest of radio group
      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(after)
    })

    it("Tab focuses checked radio when one is checked", () => {
      document.body.innerHTML = `
        <button id="before">Before</button>
        <input type="radio" name="choice" id="r1" value="1" />
        <input type="radio" name="choice" id="r2" value="2" checked />
        <input type="radio" name="choice" id="r3" value="3" />
        <button id="after">After</button>
      `
      const before = document.getElementById("before")!
      const r2 = document.getElementById("r2")!
      before.focus()

      renderer.emit(createKeyEvent("tab"))
      expect(document.activeElement).toBe(r2)
    })

    it("Arrow down/right moves to next radio and checks it", () => {
      document.body.innerHTML = `
        <input type="radio" name="choice" id="r1" value="1" />
        <input type="radio" name="choice" id="r2" value="2" />
        <input type="radio" name="choice" id="r3" value="3" />
      `
      const r1 = document.getElementById("r1")! as HTMLInputElement
      const r2 = document.getElementById("r2")! as HTMLInputElement
      r1.focus()

      renderer.emit(createKeyEvent("down"))
      expect(document.activeElement).toBe(r2)
      expect(r2.checked).toBe(true)
    })

    it("Arrow up/left moves to previous radio and checks it", () => {
      document.body.innerHTML = `
        <input type="radio" name="choice" id="r1" value="1" />
        <input type="radio" name="choice" id="r2" value="2" />
        <input type="radio" name="choice" id="r3" value="3" />
      `
      const r1 = document.getElementById("r1")! as HTMLInputElement
      const r2 = document.getElementById("r2")! as HTMLInputElement
      r2.focus()

      renderer.emit(createKeyEvent("up"))
      expect(document.activeElement).toBe(r1)
      expect(r1.checked).toBe(true)
    })

    it("Arrow navigation wraps around in radio group", () => {
      document.body.innerHTML = `
        <input type="radio" name="choice" id="r1" value="1" />
        <input type="radio" name="choice" id="r2" value="2" />
      `
      const r1 = document.getElementById("r1")! as HTMLInputElement
      const r2 = document.getElementById("r2")! as HTMLInputElement
      r2.focus()

      renderer.emit(createKeyEvent("down"))
      expect(document.activeElement).toBe(r1)
      expect(r1.checked).toBe(true)
    })
  })

  describe("accesskey support", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("Alt+key focuses element with matching accesskey", () => {
      document.body.innerHTML = `
        <input type="text" id="input" accesskey="i" />
      `
      const input = document.getElementById("input")!

      renderer.emit(createKeyEvent("i", { option: true }))
      expect(document.activeElement).toBe(input)
    })

    it("Alt+key clicks buttons with matching accesskey", () => {
      document.body.innerHTML = `
        <button id="btn" accesskey="b">Click</button>
      `
      const btn = document.getElementById("btn")!
      const clickHandler = vi.fn()
      btn.addEventListener("click", clickHandler)

      renderer.emit(createKeyEvent("b", { option: true }))
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })

    it("accesskey is case-insensitive", () => {
      document.body.innerHTML = `
        <input type="text" id="input" accesskey="I" />
      `
      const input = document.getElementById("input")!

      renderer.emit(createKeyEvent("i", { option: true }))
      expect(document.activeElement).toBe(input)
    })

    it("label accesskey focuses associated input", () => {
      document.body.innerHTML = `
        <label for="input" accesskey="n">Name:</label>
        <input type="text" id="input" />
      `
      const input = document.getElementById("input")!

      renderer.emit(createKeyEvent("n", { option: true }))
      expect(document.activeElement).toBe(input)
    })

    it("meta modifier also triggers accesskey (for ESC-prefix terminals)", () => {
      document.body.innerHTML = `
        <input type="text" id="input" accesskey="i" />
      `
      const input = document.getElementById("input")!

      renderer.emit(createKeyEvent("i", { meta: true }))
      expect(document.activeElement).toBe(input)
    })
  })

  describe("text input handling", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("character keys insert text into input", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()

      renderer.emit(createKeyEvent("a"))
      renderer.emit(createKeyEvent("b"))
      renderer.emit(createKeyEvent("c"))

      expect(input.value).toBe("abc")
    })

    it("shift+character inserts uppercase", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()

      renderer.emit(createKeyEvent("a", { shift: true }))
      expect(input.value).toBe("A")
    })

    it("space inserts space character", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()

      renderer.emit(createKeyEvent("a"))
      renderer.emit(createKeyEvent("space"))
      renderer.emit(createKeyEvent("b"))

      expect(input.value).toBe("a b")
    })

    it("backspace deletes last character", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"abc\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()

      renderer.emit(createKeyEvent("backspace"))
      expect(input.value).toBe("ab")
    })

    it("dispatches input events for text changes", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()

      const inputHandler = vi.fn()
      input.addEventListener("input", inputHandler)

      renderer.emit(createKeyEvent("a"))
      expect(inputHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe("readline shortcuts", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("Ctrl+A moves cursor to start", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 5

      renderer.emit(createKeyEvent("a", { ctrl: true }))
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe(0)
    })

    it("Ctrl+E moves cursor to end", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 0

      renderer.emit(createKeyEvent("e", { ctrl: true }))
      expect(input.selectionStart).toBe(5)
      expect(input.selectionEnd).toBe(5)
    })

    it("Ctrl+F moves cursor forward one character", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 2

      renderer.emit(createKeyEvent("f", { ctrl: true }))
      expect(input.selectionStart).toBe(3)
    })

    it("Ctrl+B moves cursor backward one character", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 2

      renderer.emit(createKeyEvent("b", { ctrl: true }))
      expect(input.selectionStart).toBe(1)
    })

    it("Ctrl+D deletes character forward", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 2

      renderer.emit(createKeyEvent("d", { ctrl: true }))
      expect(input.value).toBe("helo")
    })

    it("Ctrl+W deletes word backward", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello world\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 11

      renderer.emit(createKeyEvent("w", { ctrl: true }))
      expect(input.value).toBe("hello ")
    })

    it("Ctrl+U kills to start of line", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 3

      renderer.emit(createKeyEvent("u", { ctrl: true }))
      expect(input.value).toBe("lo")
    })

    it("Ctrl+K kills to end of line", () => {
      document.body.innerHTML = "<input type=\"text\" id=\"input\" value=\"hello\" />"
      const input = document.getElementById("input")! as HTMLInputElement
      input.focus()
      input.selectionStart = input.selectionEnd = 3

      renderer.emit(createKeyEvent("k", { ctrl: true }))
      expect(input.value).toBe("hel")
    })
  })

  describe("scroll into view", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("scrolls element into view when focusing below viewport", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn2 = document.getElementById("btn2")!

      // Create mock scroll container
      const scrollContainer: ScrollContainer = {
        scrollTop: 0,
        scrollTo: vi.fn(),
        viewport: { height: 10, width: 80 }
      }

      // Create mock renderables
      const renderable1 = { x: 0, y: 0, width: 10, height: 1, parent: null }
      const renderable2 = { x: 0, y: 15, width: 10, height: 1, parent: null }

      nodeMap.setRenderable(btn1, renderable1)
      nodeMap.setRenderable(btn2, renderable2)

      relay.setScrollContainer(document.body, scrollContainer)
      btn1.focus()

      // Tab to btn2 which is below viewport
      renderer.emit(createKeyEvent("tab"))

      expect(scrollContainer.scrollTo).toHaveBeenCalledWith(6) // 16 - 10 = 6
    })

    it("scrolls element into view when focusing above viewport", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
      `
      const btn1 = document.getElementById("btn1")!
      const btn2 = document.getElementById("btn2")!

      const scrollContainer: ScrollContainer = {
        scrollTop: 15,
        scrollTo: vi.fn(),
        viewport: { height: 10, width: 80 }
      }

      const renderable1 = { x: 0, y: 5, width: 10, height: 1, parent: null }
      const renderable2 = { x: 0, y: 20, width: 10, height: 1, parent: null }

      nodeMap.setRenderable(btn1, renderable1)
      nodeMap.setRenderable(btn2, renderable2)

      relay.setScrollContainer(document.body, scrollContainer)
      btn2.focus()

      // Shift+Tab to btn1 which is above viewport
      renderer.emit(createKeyEvent("tab", { shift: true }))

      expect(scrollContainer.scrollTo).toHaveBeenCalledWith(5)
    })
  })

  describe("preventDefault integration", () => {
    beforeEach(() => {
      relay.attach(renderer, document as unknown as Document, nodeMap)
    })

    it("respects DOM event preventDefault for blocking EventRelay behavior", () => {
      document.body.innerHTML = `
        <button id="btn1">First</button>
        <button id="btn2">Second</button>
      `
      const btn1 = document.getElementById("btn1")!
      btn1.focus()

      // DOM handler prevents default
      btn1.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          e.preventDefault()
        }
      })

      const tuiEvent = createKeyEvent("tab")
      renderer.emit(tuiEvent)

      // Focus should NOT have moved because DOM handler prevented it
      expect(document.activeElement).toBe(btn1)
      // TUI event should have been prevented too
      expect(tuiEvent.preventDefault).toHaveBeenCalled()
    })

    it("respects DOM event preventDefault for Escape in focus trap", () => {
      document.body.innerHTML = `
        <button id="outside">Outside</button>
        <div id="dialog">
          <button id="inside">Inside</button>
        </div>
      `
      const outside = document.getElementById("outside")!
      const dialog = document.getElementById("dialog")!
      const inside = document.getElementById("inside")!

      outside.focus()
      relay.activateFocusTrap(dialog)
      inside.focus()

      // DOM handler prevents Escape
      inside.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault()
        }
      })

      renderer.emit(createKeyEvent("escape"))

      // Focus trap should NOT have been released
      // Focus should still be on inside element
      expect(document.activeElement).toBe(inside)
    })
  })
})
