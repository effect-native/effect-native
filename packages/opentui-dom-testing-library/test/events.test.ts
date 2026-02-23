import { beforeEach, describe, expect, it, jest } from "bun:test"
import { createEvent, fireEvent } from "../src/events.js"

describe("fireEvent", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    document.body.innerHTML = ""
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  describe("keyDown", () => {
    it("dispatches a keydown event with string key", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, "Enter")

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as KeyboardEvent
      expect(event.key).toBe("Enter")
      expect(event.code).toBe("Enter")
      expect(event.bubbles).toBe(true)
    })

    it("dispatches a keydown event with init object", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, { key: "a", ctrlKey: true })

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as KeyboardEvent
      expect(event.key).toBe("a")
      expect(event.code).toBe("KeyA")
      expect(event.ctrlKey).toBe(true)
    })

    it("sets correct code for letter keys", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, "a")
      expect(handler.mock.calls[0][0].code).toBe("KeyA")

      fireEvent.keyDown(button, "Z")
      expect(handler.mock.calls[1][0].code).toBe("KeyZ")
    })

    it("sets correct code for number keys", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, "5")
      expect(handler.mock.calls[0][0].code).toBe("Digit5")
    })

    it("supports modifier keys", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, "c", { ctrl: true, shift: true })

      const event = handler.mock.calls[0][0] as KeyboardEvent
      expect(event.ctrlKey).toBe(true)
      expect(event.shiftKey).toBe(true)
      expect(event.altKey).toBe(false)
      expect(event.metaKey).toBe(false)
    })

    it("sets correct code for arrow keys", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keydown", handler)

      fireEvent.keyDown(button, "ArrowUp")
      expect(handler.mock.calls[0][0].code).toBe("ArrowUp")

      fireEvent.keyDown(button, "ArrowDown")
      expect(handler.mock.calls[1][0].code).toBe("ArrowDown")
    })
  })

  describe("keyUp", () => {
    it("dispatches a keyup event", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("keyup", handler)

      fireEvent.keyUp(button, "Enter")

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as KeyboardEvent
      expect(event.key).toBe("Enter")
      expect(event.type).toBe("keyup")
    })
  })

  describe("keyPress", () => {
    it("dispatches both keydown and keyup events", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const keydownHandler = jest.fn()
      const keyupHandler = jest.fn()
      button.addEventListener("keydown", keydownHandler)
      button.addEventListener("keyup", keyupHandler)

      fireEvent.keyPress(button, "Enter")

      expect(keydownHandler).toHaveBeenCalledTimes(1)
      expect(keyupHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe("click", () => {
    it("dispatches Enter keypress then click event", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const events: Array<string> = []
      button.addEventListener("keydown", () => events.push("keydown"))
      button.addEventListener("keyup", () => events.push("keyup"))
      button.addEventListener("click", () => events.push("click"))

      fireEvent.click(button)

      expect(events).toEqual(["keydown", "keyup", "click"])
    })

    it("triggers click handlers", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("click", handler)

      fireEvent.click(button)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe("focus", () => {
    it("focuses the element and dispatches focus events", () => {
      const input = document.createElement("input")
      container.appendChild(input)

      const focusHandler = jest.fn()
      const focusinHandler = jest.fn()
      input.addEventListener("focus", focusHandler)
      input.addEventListener("focusin", focusinHandler)

      fireEvent.focus(input)

      expect(document.activeElement).toBe(input)
      expect(focusHandler).toHaveBeenCalled()
      expect(focusinHandler).toHaveBeenCalled()
    })
  })

  describe("blur", () => {
    it("blurs the element and dispatches blur events", () => {
      const input = document.createElement("input")
      container.appendChild(input)
      input.focus()

      const blurHandler = jest.fn()
      const focusoutHandler = jest.fn()
      input.addEventListener("blur", blurHandler)
      input.addEventListener("focusout", focusoutHandler)

      fireEvent.blur(input)

      expect(blurHandler).toHaveBeenCalled()
      expect(focusoutHandler).toHaveBeenCalled()
    })
  })

  describe("change", () => {
    it("changes input value and dispatches input/change events", () => {
      const input = document.createElement("input")
      container.appendChild(input)

      const inputHandler = jest.fn()
      const changeHandler = jest.fn()
      input.addEventListener("input", inputHandler)
      input.addEventListener("change", changeHandler)

      fireEvent.change(input, { target: { value: "hello" } })

      expect(input.value).toBe("hello")
      expect(inputHandler).toHaveBeenCalled()
      expect(changeHandler).toHaveBeenCalled()
    })

    it("returns false for non-input elements", () => {
      const div = document.createElement("div")
      container.appendChild(div)

      const result = fireEvent.change(div, { target: { value: "hello" } })
      expect(result).toBe(false)
    })
  })

  describe("type", () => {
    it("types characters into an input element", async () => {
      const input = document.createElement("input")
      container.appendChild(input)
      input.focus()

      await fireEvent.type(input, "abc")

      expect(input.value).toBe("abc")
    })

    it("handles special keys like {enter}", async () => {
      const input = document.createElement("input")
      container.appendChild(input)
      input.focus()

      const handler = jest.fn()
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handler()
      })

      await fireEvent.type(input, "test{enter}")

      expect(input.value).toBe("test")
      expect(handler).toHaveBeenCalled()
    })

    it("handles {backspace} to delete characters", async () => {
      const input = document.createElement("input")
      container.appendChild(input)
      input.value = "hello"
      input.focus()

      await fireEvent.type(input, "{backspace}")

      expect(input.value).toBe("hell")
    })
  })

  describe("tab", () => {
    it("moves focus to next focusable element", () => {
      const button1 = document.createElement("button")
      const button2 = document.createElement("button")
      button1.textContent = "Button 1"
      button2.textContent = "Button 2"
      container.appendChild(button1)
      container.appendChild(button2)

      button1.focus()
      expect(document.activeElement).toBe(button1)

      fireEvent.tab()

      expect(document.activeElement).toBe(button2)
    })

    it("moves focus to previous element with shift", () => {
      const button1 = document.createElement("button")
      const button2 = document.createElement("button")
      button1.textContent = "Button 1"
      button2.textContent = "Button 2"
      container.appendChild(button1)
      container.appendChild(button2)

      button2.focus()
      expect(document.activeElement).toBe(button2)

      fireEvent.tab({ shift: true })

      expect(document.activeElement).toBe(button1)
    })

    it("wraps around to first element", () => {
      const button1 = document.createElement("button")
      const button2 = document.createElement("button")
      button1.textContent = "Button 1"
      button2.textContent = "Button 2"
      container.appendChild(button1)
      container.appendChild(button2)

      button2.focus()
      fireEvent.tab()

      expect(document.activeElement).toBe(button1)
    })
  })

  describe("dblClick", () => {
    it("dispatches dblclick event", () => {
      const button = document.createElement("button")
      container.appendChild(button)

      const handler = jest.fn()
      button.addEventListener("dblclick", handler)

      fireEvent.dblClick(button)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe("scroll", () => {
    it("sets scroll position and dispatches scroll event", () => {
      const div = document.createElement("div")
      div.style.overflow = "auto"
      div.style.height = "100px"
      container.appendChild(div)

      const handler = jest.fn()
      div.addEventListener("scroll", handler)

      fireEvent.scroll(div, { target: { scrollTop: 50 } })

      expect(div.scrollTop).toBe(50)
      expect(handler).toHaveBeenCalled()
    })
  })
})

describe("createEvent", () => {
  describe("keyDown", () => {
    it("creates a keydown event", () => {
      const button = document.createElement("button")
      const event = createEvent.keyDown(button, { key: "Enter" })

      expect(event.type).toBe("keydown")
      expect(event.key).toBe("Enter")
      expect(event.bubbles).toBe(true)
      expect(event.cancelable).toBe(true)
    })
  })

  describe("click", () => {
    it("creates a click event", () => {
      const button = document.createElement("button")
      const event = createEvent.click(button)

      expect(event.type).toBe("click")
      expect(event.bubbles).toBe(true)
      expect(event.button).toBe(0)
    })
  })

  describe("focus", () => {
    it("creates a focus event", () => {
      const input = document.createElement("input")
      const event = createEvent.focus(input)

      expect(event.type).toBe("focus")
      expect(event.bubbles).toBe(false)
    })
  })

  describe("blur", () => {
    it("creates a blur event", () => {
      const input = document.createElement("input")
      const event = createEvent.blur(input)

      expect(event.type).toBe("blur")
      expect(event.bubbles).toBe(false)
    })
  })
})
