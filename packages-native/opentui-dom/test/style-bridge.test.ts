import type { Window } from "happy-dom"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { createStyleBridge } from "../src/bridge/style-bridge.js"

describe("style-bridge", () => {
  let document: Document
  let window: Window

  beforeEach(async () => {
    const { Window } = await import("happy-dom")
    window = new Window({ url: "https://localhost" })
    document = window.document as unknown as Document
  })

  afterEach(() => {
    window.close()
  })

  describe("createStyleBridge", () => {
    it("creates a style bridge instance", () => {
      const bridge = createStyleBridge()
      expect(bridge).toBeDefined()
      expect(typeof bridge.getStyleProps).toBe("function")
      expect(typeof bridge.applyStyles).toBe("function")
    })
  })

  describe("getStyleProps", () => {
    it("extracts tailwind classes from className", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"flex flex-col gap-2 p-4\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.flexDirection).toBe("column")
      expect(props.gap).toBe(1)
      expect(props.padding).toBe(1)
    })

    it("extracts colors from tailwind classes", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-blue-500 text-white\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#3B82F6")
      expect(props.backgroundColor).toBe("#3B82F6")
      expect(props.fg).toBe("#FFFFFF")
    })

    it("extracts border styles", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"border border-gray-300 rounded\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.border).toBe(true)
      expect(props.borderColor).toBe("#D1D5DB")
      expect(props.borderStyle).toBe("rounded")
    })

    it("extracts typography styles", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"font-bold italic underline\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bold).toBe(true)
      expect(props.italic).toBe(true)
      expect(props.underline).toBe(true)
    })
  })

  describe("data-tui-* attributes", () => {
    it("extracts data-tui-bg attribute", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-bg=\"#ff0000\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#ff0000")
      expect(props.backgroundColor).toBe("#ff0000")
    })

    it("extracts data-tui-fg attribute", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-fg=\"white\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.fg).toBe("white")
    })

    it("extracts data-tui-border attribute", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-border=\"true\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.border).toBe(true)
    })

    it("extracts data-tui-border-style attribute (lowercased by HTML)", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-border-style=\"rounded\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.borderStyle).toBe("rounded")
    })

    it("extracts numeric attributes", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-padding=\"3\" data-tui-margin=\"2\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.padding).toBe(3)
      expect(props.margin).toBe(2)
    })

    it("extracts z-index attribute", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-z-index=\"100\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.zIndex).toBe(100)
    })

    it("extracts flex direction from data attribute", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div data-tui-flex-direction=\"column\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.flexDirection).toBe("column")
    })

    it("data attributes override tailwind classes", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-blue-500\" data-tui-bg=\"#ff0000\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      // data-tui-bg should override bg-blue-500
      expect(props.bg).toBe("#ff0000")
    })
  })

  describe("theme classes", () => {
    it("maps bg-background to CSS variable default", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-background\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#09090B") // zinc-950 dark default
    })

    it("maps text-foreground to CSS variable default", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"text-foreground\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.fg).toBe("#FAFAFA") // zinc-50
    })

    it("maps bg-primary to CSS variable default", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-primary\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#FAFAFA") // primary default
    })

    it("maps bg-destructive to CSS variable default", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-destructive\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#7F1D1D") // red-900
    })

    it("maps border-border to CSS variable default", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"border-border\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.borderColor).toBe("#27272A") // zinc-800
    })
  })

  describe("CSS variable overrides", () => {
    it("uses custom CSS variable overrides", () => {
      const bridge = createStyleBridge({
        cssVarOverrides: {
          "--background": "#ffffff",
          "--foreground": "#000000"
        }
      })
      document.body.innerHTML = "<div class=\"bg-background text-foreground\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(props.bg).toBe("#ffffff")
      expect(props.fg).toBe("#000000")
    })
  })

  describe("applyStyles", () => {
    it("applies style props to a renderable object", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"bg-blue-500 flex-col p-4\"></div>"
      const element = document.querySelector("div")!

      const renderable: Record<string, unknown> = {}
      bridge.applyStyles(element, renderable)

      expect(renderable.bg).toBe("#3B82F6")
      expect(renderable.flexDirection).toBe("column")
      expect(renderable.padding).toBe(1)
    })

    it("does not set undefined properties", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div></div>"
      const element = document.querySelector("div")!

      const renderable: Record<string, unknown> = { existing: "value" }
      bridge.applyStyles(element, renderable)

      expect(Object.keys(renderable)).toEqual(["existing"])
    })
  })

  describe("edge cases", () => {
    it("handles empty className", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(Object.keys(props)).toHaveLength(0)
    })

    it("handles whitespace-only className", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"   \"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      expect(Object.keys(props)).toHaveLength(0)
    })

    it("handles mixed valid and invalid classes", () => {
      const bridge = createStyleBridge()
      document.body.innerHTML = "<div class=\"flex shadow-lg unknown-class p-4\"></div>"
      const element = document.querySelector("div")!

      const props = bridge.getStyleProps(element)

      // Valid classes are extracted
      expect(props.padding).toBe(1)
      // Invalid classes are ignored
      expect(props).not.toHaveProperty("shadow")
    })
  })
})
