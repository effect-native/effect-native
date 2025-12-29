import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Window } from "happy-dom"
import {
  createDOMToTUIBridge,
  type TUIContainer,
  type TUIText,
  type RenderableFactory,
  type DOMToTUIBridge,
  type WindowLike,
} from "../src/bridge/dom-to-tui-bridge.js"
import type { MappedRenderable } from "../src/bridge/node-map.js"

// Mock TUI Renderables for testing

/** MockBox that captures style props via Proxy */
function createMockBox(props: Record<string, unknown> = {}): MappedRenderable & TUIContainer & { props: Record<string, unknown>, children: MappedRenderable[] } {
  const children: MappedRenderable[] = []
  const storedProps: Record<string, unknown> = { ...props }

  const box = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    parent: null as MappedRenderable | null,
    children,
    props: storedProps,

    add(child: MappedRenderable): void {
      children.push(child)
      ;(child as { parent: MappedRenderable | null }).parent = box
    },

    remove(child: MappedRenderable): void {
      const index = children.indexOf(child)
      if (index !== -1) {
        children.splice(index, 1)
        ;(child as { parent: MappedRenderable | null }).parent = null
      }
    },
  }

  // Return a Proxy that captures any property set (for applyStyles)
  return new Proxy(box, {
    set(target, prop, value) {
      if (typeof prop === "string") {
        storedProps[prop] = value
      }
      ;(target as Record<string | symbol, unknown>)[prop] = value
      return true
    },
    get(target, prop) {
      return (target as Record<string | symbol, unknown>)[prop]
    },
  }) as typeof box
}

// Keep MockBox class for type compatibility in tests
class MockBox implements MappedRenderable, TUIContainer {
  x = 0
  y = 0
  width = 0
  height = 0
  parent: MappedRenderable | null = null
  children: MappedRenderable[] = []
  props: Record<string, unknown> = {}

  constructor(props: Record<string, unknown> = {}) {
    this.props = { ...props }
  }

  add(child: MappedRenderable): void {
    this.children.push(child)
    ;(child as { parent: MappedRenderable | null }).parent = this
  }

  remove(child: MappedRenderable): void {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      ;(child as { parent: MappedRenderable | null }).parent = null
    }
  }
}

class MockText implements TUIText {
  x = 0
  y = 0
  width = 0
  height = 0
  parent: MappedRenderable | null = null
  content: string

  constructor(content: string) {
    this.content = content
  }
}

// Test helpers

function createTestFactory(): RenderableFactory {
  return {
    createBox: (options = {}) => createMockBox(options),
    createText: (content) => new MockText(content),
  }
}

function createTestRoot() {
  return createMockBox()
}

/** Wait for MutationObserver callbacks in happy-dom */
async function flushMutations(win: Window): Promise<void> {
  // happy-dom requires waitUntilComplete to process MutationObserver callbacks
  await win.happyDOM.waitUntilComplete()
}

describe("DOMToTUIBridge", () => {
  let window: Window
  let document: Document
  let factory: RenderableFactory
  let root: ReturnType<typeof createMockBox>
  let bridge: DOMToTUIBridge

  beforeEach(() => {
    window = new Window({ url: "https://localhost/" })
    document = window.document as unknown as Document
    factory = createTestFactory()
    root = createTestRoot()
    bridge = createDOMToTUIBridge({
      factory,
      root,
      debug: false,
      window: window as unknown as WindowLike,
    })
  })

  afterEach(() => {
    bridge.disconnect()
    window.happyDOM.close()
  })

  describe("observe()", () => {
    it("starts observing mutations on the container", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)

      bridge.observe(container)

      // Add a child - should trigger mutation
      const span = document.createElement("span")
      container.appendChild(span)

      await flushMutations(window)
      expect(root.children.length).toBe(1)
    })

    it("handles multiple observations by disconnecting previous observer", async () => {
      const container1 = document.createElement("div")
      const container2 = document.createElement("div")
      document.body.appendChild(container1)
      document.body.appendChild(container2)

      bridge.observe(container1)
      bridge.observe(container2)

      // Add to container1 - should NOT trigger (no longer observing)
      const span1 = document.createElement("span")
      container1.appendChild(span1)

      // Add to container2 - SHOULD trigger
      const span2 = document.createElement("span")
      container2.appendChild(span2)

      await flushMutations(window)
      // Only container2 mutations should be captured
      expect(root.children.length).toBe(1)
    })
  })

  describe("disconnect()", () => {
    it("stops observing mutations", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)

      bridge.observe(container)
      bridge.disconnect()

      // Add a child - should NOT trigger mutation
      const span = document.createElement("span")
      container.appendChild(span)

      await flushMutations(window)
      expect(root.children.length).toBe(0)
    })

    it("is safe to call multiple times", () => {
      bridge.disconnect()
      bridge.disconnect()
      // No error thrown
    })
  })

  describe("childList mutations", () => {
    it("creates box renderable for added element nodes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const child = document.createElement("div")
      container.appendChild(child)

      await flushMutations(window)
      expect(root.children.length).toBe(1)
      expect(root.children[0]).toBeDefined()
      expect((root.children[0] as { props: Record<string, unknown> }).props).toBeDefined()
    })

    it("creates text renderable for added text nodes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const text = document.createTextNode("Hello World")
      container.appendChild(text)

      await flushMutations(window)
      expect(root.children.length).toBe(1)
      expect(root.children[0]).toBeInstanceOf(MockText)
      expect((root.children[0] as MockText).content).toBe("Hello World")
    })

    it("skips empty text nodes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const text = document.createTextNode("   ")
      container.appendChild(text)

      await flushMutations(window)
      expect(root.children.length).toBe(0)
    })

    it("removes renderable when node is removed", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const child = document.createElement("div")
      container.appendChild(child)
      await flushMutations(window)
      expect(root.children.length).toBe(1)

      container.removeChild(child)
      await flushMutations(window)
      expect(root.children.length).toBe(0)
    })

    it("handles nested element structure", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const outer = document.createElement("div")
      const inner = document.createElement("span")
      outer.appendChild(inner)
      container.appendChild(outer)

      await flushMutations(window)
      // Root should have outer box
      expect(root.children.length).toBe(1)
      const outerBox = root.children[0] as MockBox

      // Outer should have inner box
      expect(outerBox.children.length).toBe(1)
      expect((outerBox.children[0] as { props: Record<string, unknown> }).props).toBeDefined()
    })

    it("handles element with text content", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const p = document.createElement("p")
      p.textContent = "Paragraph text"
      container.appendChild(p)

      await flushMutations(window)
      expect(root.children.length).toBe(1)
      const pBox = root.children[0] as MockBox

      // P element should have text child
      expect(pBox.children.length).toBe(1)
      expect(pBox.children[0]).toBeInstanceOf(MockText)
      expect((pBox.children[0] as MockText).content).toBe("Paragraph text")
    })
  })

  describe("characterData mutations", () => {
    it("updates text renderable content when text node changes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const text = document.createTextNode("Initial")
      container.appendChild(text)

      await flushMutations(window)
      const textRenderable = root.children[0] as MockText
      expect(textRenderable.content).toBe("Initial")

      // Update text content
      text.textContent = "Updated"

      await flushMutations(window)
      expect(textRenderable.content).toBe("Updated")
    })
  })

  describe("attribute mutations", () => {
    it("re-applies styles when class attribute changes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const div = document.createElement("div")
      div.className = "bg-blue-500"
      container.appendChild(div)

      await flushMutations(window)
      const box = root.children[0] as MockBox

      // Check that styles were applied initially
      expect(box.props.bg).toBeDefined()

      // Change class
      div.className = "bg-red-500"

      await flushMutations(window)
      // Style should be updated (StyleBridge re-applied)
      // Note: The actual color value depends on StyleBridge implementation
      expect(box.props.bg).toBeDefined()
    })

    it("re-applies styles when data-tui-* attribute changes", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const div = document.createElement("div")
      container.appendChild(div)

      await flushMutations(window)
      const box = root.children[0] as MockBox

      // Set data-tui attribute
      div.setAttribute("data-tui-bg", "#ff0000")

      await flushMutations(window)
      // Style should be applied - Proxy captures all sets in props
      expect(box.props.bg).toBe("#ff0000")
    })
  })

  describe("nodeMap", () => {
    it("provides access to the NodeMap", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const child = document.createElement("div")
      container.appendChild(child)

      await flushMutations(window)
      // Should be able to look up renderable by node
      const renderable = bridge.nodeMap.getRenderable(child) as { props: Record<string, unknown> }
      expect(renderable).toBeDefined()
      expect(renderable.props).toBeDefined()
    })

    it("allows reverse lookup from renderable to node", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const child = document.createElement("div")
      container.appendChild(child)

      await flushMutations(window)
      const renderable = bridge.nodeMap.getRenderable(child)
      const node = bridge.nodeMap.getNode(renderable!)

      expect(node).toBe(child)
    })
  })

  describe("processExistingChildren()", () => {
    it("processes pre-existing DOM children", () => {
      const container = document.createElement("div")
      const existing = document.createElement("span")
      existing.textContent = "Existing"
      container.appendChild(existing)
      document.body.appendChild(container)

      // Process existing children BEFORE observing (synchronous)
      bridge.processExistingChildren(container)

      expect(root.children.length).toBe(1)
      const spanBox = root.children[0] as MockBox
      expect(spanBox.children.length).toBe(1)
      expect((spanBox.children[0] as MockText).content).toBe("Existing")
    })

    it("does not duplicate when called multiple times", () => {
      const container = document.createElement("div")
      const existing = document.createElement("span")
      container.appendChild(existing)
      document.body.appendChild(container)

      bridge.processExistingChildren(container)
      bridge.processExistingChildren(container)

      // Should only have one child, not duplicated
      expect(root.children.length).toBe(1)
    })
  })

  describe("style application", () => {
    it("applies tailwind classes as style props", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const div = document.createElement("div")
      div.className = "flex flex-col p-4 bg-zinc-800"
      container.appendChild(div)

      await flushMutations(window)
      const box = root.children[0] as MockBox

      expect(box.props.flexDirection).toBe("column")
      expect(box.props.padding).toBe(1) // p-4 maps to 1 cell in TUI
      expect(box.props.bg).toBeDefined()
    })

    it("applies data-tui-* attributes as style props", async () => {
      const container = document.createElement("div")
      document.body.appendChild(container)
      bridge.observe(container)

      const div = document.createElement("div")
      div.setAttribute("data-tui-border", "true")
      div.setAttribute("data-tui-borderstyle", "rounded")
      container.appendChild(div)

      await flushMutations(window)
      const box = root.children[0] as MockBox

      expect(box.props.border).toBe(true)
      expect(box.props.borderStyle).toBe("rounded")
    })
  })
})
