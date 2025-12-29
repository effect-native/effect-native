/**
 * NodeMap - Bidirectional mapping between DOM nodes and TUI Renderables
 *
 * This module provides the core data structure for tracking the relationship
 * between happy-dom DOM nodes and OpenTUI Renderable instances. It enables:
 * - Looking up a Renderable from its corresponding DOM node (for mutations)
 * - Looking up a DOM node from its Renderable (for event relay)
 *
 * Memory management:
 * - Uses WeakMap<Node, Renderable> so entries are GC'd when DOM nodes are removed
 * - Uses Map<Renderable, WeakRef<Node>> for reverse lookup with weak references
 *
 * @module bridge/node-map
 */

/** Generic Renderable interface for TUI renderables with position */
export interface PositionedRenderable {
  x: number
  y: number
  width: number
  height: number
  parent: PositionedRenderable | null
}

/** Union of Renderable types that can be mapped to DOM nodes */
export type MappedRenderable = PositionedRenderable | object

/** NodeMap interface for bidirectional DOM<->TUI mapping */
export interface NodeMap {
  /** Map a DOM node to its corresponding Renderable */
  setRenderable(node: Node, renderable: MappedRenderable): void

  /** Get the Renderable for a DOM node, if mapped */
  getRenderable(node: Node): MappedRenderable | undefined

  /** Get the DOM node for a Renderable, if mapped */
  getNode(renderable: MappedRenderable): Node | undefined

  /** Remove the mapping for a DOM node (and its reverse mapping) */
  delete(node: Node): void

  /** Check if a DOM node has a mapping */
  has(node: Node): boolean
}

/**
 * Implementation of NodeMap using WeakMap for memory-efficient GC
 *
 * The domToRenderable WeakMap ensures that when a DOM node is removed and
 * no longer referenced, its entry is automatically garbage collected.
 *
 * The renderableToNode Map with WeakRef values allows reverse lookup
 * while still enabling GC when the DOM node is collected.
 */
export class NodeMapImpl implements NodeMap {
  /** Primary mapping: DOM Node -> Renderable (weak reference to DOM node as key) */
  private domToRenderable = new WeakMap<Node, MappedRenderable>()

  /**
   * Reverse mapping: Renderable -> DOM Node
   *
   * Uses WeakRef to avoid preventing GC of DOM nodes.
   * Note: Renderables don't have guaranteed stable identity for WeakMap keys,
   * so we use a regular Map with WeakRef values instead.
   */
  private renderableToNode = new Map<MappedRenderable, WeakRef<Node>>()

  setRenderable(node: Node, renderable: MappedRenderable): void {
    // Clean up any existing reverse mapping for this renderable
    const existingRef = this.renderableToNode.get(renderable)
    if (existingRef) {
      const existingNode = existingRef.deref()
      if (existingNode && existingNode !== node) {
        // Renderable was previously mapped to a different node
        this.domToRenderable.delete(existingNode)
      }
    }

    this.domToRenderable.set(node, renderable)
    this.renderableToNode.set(renderable, new WeakRef(node))
  }

  getRenderable(node: Node): MappedRenderable | undefined {
    return this.domToRenderable.get(node)
  }

  getNode(renderable: MappedRenderable): Node | undefined {
    const ref = this.renderableToNode.get(renderable)
    if (!ref) return undefined

    const node = ref.deref()
    if (!node) {
      // Node was garbage collected, clean up the stale entry
      this.renderableToNode.delete(renderable)
      return undefined
    }
    return node
  }

  delete(node: Node): void {
    const renderable = this.domToRenderable.get(node)
    if (renderable) {
      this.renderableToNode.delete(renderable)
    }
    this.domToRenderable.delete(node)
  }

  has(node: Node): boolean {
    return this.domToRenderable.has(node)
  }
}

/** Factory function to create a new NodeMap instance */
export function createNodeMap(): NodeMap {
  return new NodeMapImpl()
}
