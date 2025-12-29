/**
 * DOM to TUI Bridge: Observes DOM mutations and syncs to TUI Renderables
 *
 * This module provides the core bridge that observes DOM changes via MutationObserver
 * and translates them into operations on TUI Renderable objects. It is the primary
 * integration point between the DOM tree and the TUI rendering system.
 *
 * Features:
 * - Observes childList, characterData, and attributes mutations
 * - Creates TUI Renderables for new DOM nodes
 * - Updates existing Renderables when DOM nodes change
 * - Removes Renderables when DOM nodes are removed
 * - Applies styles via StyleBridge for className/attribute changes
 *
 * @module bridge/dom-to-tui-bridge
 */

import type { NodeMap, MappedRenderable } from "./node-map.js"
import { createNodeMap } from "./node-map.js"
import type { StyleBridge } from "./style-bridge.js"
import { createStyleBridge } from "./style-bridge.js"

/** Minimal interface for TUI Renderable containers */
export interface TUIContainer {
  add(child: MappedRenderable): void
  remove(child: MappedRenderable): void
}

/** Minimal interface for TUI Text-like renderables */
export interface TUIText extends MappedRenderable {
  content: string
}

/** Factory function to create TUI renderables */
export interface RenderableFactory {
  /** Create a box/container renderable */
  createBox(options?: Record<string, unknown>): MappedRenderable & TUIContainer
  /** Create a text renderable */
  createText(content: string, options?: Record<string, unknown>): TUIText
}

/** Minimal Window interface for MutationObserver access */
export interface WindowLike {
  MutationObserver: typeof MutationObserver
}

/** Options for creating a DOMToTUIBridge */
export interface DOMToTUIBridgeOptions {
  /** Enable debug logging */
  debug?: boolean
  /** Custom NodeMap instance (defaults to new one) */
  nodeMap?: NodeMap
  /** Custom StyleBridge instance (defaults to new one) */
  styleBridge?: StyleBridge
  /** Factory to create TUI renderables */
  factory: RenderableFactory
  /** Root TUI container to add elements to */
  root: TUIContainer
  /** Window to get MutationObserver from (defaults to globalThis) */
  window?: WindowLike
}

/** Interface for the DOM to TUI bridge */
export interface DOMToTUIBridge {
  /** Start observing a container for mutations */
  observe(container: Element): void
  /** Stop observing and clean up */
  disconnect(): void
  /** Get the NodeMap for external access (e.g., event relay) */
  readonly nodeMap: NodeMap
  /** Process existing children of an element (for initial sync) */
  processExistingChildren(container: Element): void
}

/**
 * Creates a DOMToTUIBridge that syncs DOM mutations to TUI Renderables.
 *
 * @example
 * ```ts
 * const bridge = createDOMToTUIBridge({
 *   factory: {
 *     createBox: () => new MockBox(),
 *     createText: (content) => new MockText(content),
 *   },
 *   root: mockRoot,
 *   debug: true,
 * })
 *
 * bridge.observe(document.body)
 * // DOM mutations now sync to TUI...
 * bridge.disconnect()
 * ```
 */
export function createDOMToTUIBridge(options: DOMToTUIBridgeOptions): DOMToTUIBridge {
  const { debug = false, factory, root, window: windowLike } = options
  const nodeMap = options.nodeMap ?? createNodeMap()
  const styleBridge = options.styleBridge ?? createStyleBridge({ debug })

  // Get MutationObserver constructor from provided window or globalThis
  const MutationObserverCtor =
    windowLike?.MutationObserver ?? (globalThis as unknown as WindowLike).MutationObserver

  let observer: MutationObserver | null = null

  const log = debug ? console.log.bind(console, "[DOMToTUIBridge]") : () => {}

  /**
   * Find the parent TUI renderable for a DOM node.
   * Walks up the DOM tree to find a mapped parent.
   */
  function findParentRenderable(node: Node): (MappedRenderable & TUIContainer) | null {
    let parent = node.parentNode
    while (parent) {
      const renderable = nodeMap.getRenderable(parent)
      if (renderable && "add" in renderable) {
        return renderable as MappedRenderable & TUIContainer
      }
      parent = parent.parentNode
    }
    return null
  }

  /**
   * Add a DOM node to the TUI tree.
   */
  function addNode(node: Node, parentNode: Node | null): void {
    if (node.nodeType === 1) {
      // Element node
      addElementNode(node as Element, parentNode)
    } else if (node.nodeType === 3) {
      // Text node
      addTextNode(node as Text, parentNode)
    }
  }

  /**
   * Add an element node to the TUI tree.
   */
  function addElementNode(element: Element, parentNode: Node | null): void {
    // Skip if already mapped
    if (nodeMap.has(element)) {
      log(`Element already mapped: <${element.tagName.toLowerCase()}>`)
      return
    }

    const tagName = element.tagName.toLowerCase()
    log(`Adding element: <${tagName}>`)

    // Get style props from the element
    const styleProps = styleBridge.getStyleProps(element)

    // Create a box renderable for the element
    const box = factory.createBox(styleProps)
    nodeMap.setRenderable(element, box)

    // Add to parent TUI container
    const parentRenderable = parentNode ? findParentRenderable(element) : null
    const container = parentRenderable ?? root
    container.add(box)

    // Process existing children
    for (const child of Array.from(element.childNodes)) {
      addNode(child, element)
    }
  }

  /**
   * Add a text node to the TUI tree.
   */
  function addTextNode(textNode: Text, parentNode: Node | null): void {
    // Skip if already mapped
    if (nodeMap.has(textNode)) {
      return
    }

    const content = textNode.textContent?.trim() || ""

    // Skip empty/whitespace-only text nodes
    if (!content) {
      return
    }

    log(`Adding text: "${content}"`)

    // Create a text renderable
    const text = factory.createText(content)
    nodeMap.setRenderable(textNode, text)

    // Add to parent TUI container
    const parentRenderable = parentNode ? findParentRenderable(textNode) : null
    const container = parentRenderable ?? root
    container.add(text)
  }

  /**
   * Remove a DOM node from the TUI tree.
   */
  function removeNode(node: Node): void {
    const renderable = nodeMap.getRenderable(node)
    if (renderable) {
      log(`Removing node: ${node.nodeName}`)

      // Find parent container and remove
      const parentRenderable = findParentRenderable(node)
      const container = parentRenderable ?? root
      container.remove(renderable)

      nodeMap.delete(node)
    }

    // Recursively remove children
    if (node.nodeType === 1) {
      for (const child of Array.from((node as Element).childNodes)) {
        removeNode(child)
      }
    }
  }

  /**
   * Handle childList mutations (add/remove nodes).
   */
  function handleChildList(mutation: MutationRecord): void {
    // Process removed nodes first
    for (const node of Array.from(mutation.removedNodes)) {
      removeNode(node)
    }

    // Process added nodes
    for (const node of Array.from(mutation.addedNodes)) {
      addNode(node, mutation.target)
    }
  }

  /**
   * Handle characterData mutations (text content changes).
   */
  function handleCharacterData(mutation: MutationRecord): void {
    const textNode = mutation.target as Text
    const renderable = nodeMap.getRenderable(textNode)

    if (renderable && "content" in renderable) {
      const newContent = textNode.textContent || ""
      log(`Text update: "${mutation.oldValue}" -> "${newContent}"`)
      ;(renderable as TUIText).content = newContent
    }
  }

  /**
   * Handle attribute mutations (className, style, data-* changes).
   */
  function handleAttributes(mutation: MutationRecord): void {
    const element = mutation.target as Element
    const renderable = nodeMap.getRenderable(element)

    if (!renderable) {
      return
    }

    const attrName = mutation.attributeName

    log(`Attribute "${attrName}" changed on <${element.tagName.toLowerCase()}>`)

    // Re-apply styles when class or style attribute changes
    if (attrName === "class" || attrName === "style" || attrName?.startsWith("data-tui-")) {
      styleBridge.applyStyles(element, renderable)
    }
  }

  /**
   * Handle incoming mutations batch.
   */
  function handleMutations(mutations: MutationRecord[]): void {
    log(`Received ${mutations.length} mutation(s)`)

    for (const mutation of mutations) {
      switch (mutation.type) {
        case "childList":
          handleChildList(mutation)
          break
        case "characterData":
          handleCharacterData(mutation)
          break
        case "attributes":
          handleAttributes(mutation)
          break
      }
    }
  }

  return {
    observe(container: Element): void {
      if (observer) {
        observer.disconnect()
      }

      observer = new MutationObserverCtor(handleMutations)
      observer.observe(container, {
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
      })

      log(`Observing container: <${container.tagName.toLowerCase()}>`)
    },

    disconnect(): void {
      if (observer) {
        observer.disconnect()
        observer = null
        log("Disconnected")
      }
    },

    get nodeMap(): NodeMap {
      return nodeMap
    },

    processExistingChildren(container: Element): void {
      log(`Processing existing children of <${container.tagName.toLowerCase()}>`)
      for (const child of Array.from(container.childNodes)) {
        addNode(child, container)
      }
    },
  }
}

export default createDOMToTUIBridge
