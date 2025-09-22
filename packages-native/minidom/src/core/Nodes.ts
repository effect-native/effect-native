/**
 * MiniDom-flavoured DOM node model definitions.
 *
 * These types mirror the browser DOM surface but swap imperative methods for
 * {@link effect/Effect!Effect} actions that report {@link MiniDomError.MiniDomError}.
 *
 * @since 0.0.0
 */
import type * as Effect from "effect/Effect"

import type { View as AttributeBagView } from "./AttributeBag.js"
import type * as MiniDomError from "./MiniDomError.js"
import type { Namespace } from "./Namespace.js"

type MiniDomEffect<A> = Effect.Effect<A, MiniDomError.MiniDomError>

/**
 * Map of DOM `Node.nodeType` constants used by MiniDom.
 *
 * The numeric values match the WHATWG DOM specification so existing code can
 * branch on familiar semantics.
 *
 * @since 0.0.0
 * @category symbols
 * @example
 * ```ts
 * import { Nodes } from "@effect-native/minidom"
 *
 * const describe = (node: Nodes.Node) => {
 *   switch (node.nodeType) {
 *     case Nodes.NodeType.Element:
 *       return "element"
 *     case Nodes.NodeType.Text:
 *       return "text"
 *     default:
 *       return "other"
 *   }
 * }
 * ```
 */
export const NodeType = {
  Element: 1,
  Text: 3,
  ProcessingInstruction: 7,
  Comment: 8,
  Document: 9,
  DocumentType: 10,
  DocumentFragment: 11
} as const

/**
 * Union of the numeric {@link NodeType} constants.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const accepts: (type: MiniDom.Nodes.NodeType) => void = () => {}
 * accepts(MiniDom.Nodes.NodeType.Comment)
 * ```
 */
export type NodeType = typeof NodeType[keyof typeof NodeType]

/**
 * Base MiniDom node interface shared by all DOM node types.
 *
 * The asynchronous operations return {@link MiniDomError.MiniDomError}-aware
 * effects instead of mutating in place.
 *
 * @since 0.0.0
 * @category model
 */
export interface Node {
  readonly nodeType: NodeType
  readonly nodeName: string
  readonly ownerDocument: Document | null
  readonly parentNode: Element | Document | DocumentFragment | null
  readonly previousSibling: Node | null
  readonly nextSibling: Node | null
  readonly textContent: string | null
  readonly clone: (options?: { readonly deep?: boolean }) => MiniDomEffect<Node>
}

/**
 * Node methods that are available on `ChildNode` participants.
 *
 * @since 0.0.0
 * @category model
 */
export interface ChildNode {
  readonly before: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
  readonly after: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
  readonly replaceWith: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
  readonly remove: () => MiniDomEffect<void>
}

/**
 * Properties and operations exposed by nodes that can contain children.
 *
 * @since 0.0.0
 * @category model
 */
export interface ParentNode {
  readonly childNodes: ReadonlyArray<Node>
  readonly children: ReadonlyArray<Element>
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  readonly append: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
  readonly prepend: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
  readonly replaceChildren: (...nodes: ReadonlyArray<Node | string>) => MiniDomEffect<void>
}

/**
 * Shared surface for nodes whose contents are text-based.
 *
 * @since 0.0.0
 * @category model
 */
export interface CharacterData extends Node, ChildNode {
  readonly data: string
  readonly length: number
  readonly substringData: (offset: number, count: number) => MiniDomEffect<string>
}

/**
 * MiniDom `Text` node wrapper.
 *
 * @since 0.0.0
 * @category model
 */
export interface Text extends CharacterData {
  readonly nodeType: typeof NodeType.Text
  readonly nodeName: "#text"
}

/**
 * MiniDom `Comment` node wrapper.
 *
 * @since 0.0.0
 * @category model
 */
export interface Comment extends CharacterData {
  readonly nodeType: typeof NodeType.Comment
  readonly nodeName: "#comment"
}

/**
 * MiniDom `ProcessingInstruction` node wrapper.
 *
 * @since 0.0.0
 * @category model
 */
export interface ProcessingInstruction extends CharacterData {
  readonly nodeType: typeof NodeType.ProcessingInstruction
  readonly target: string
}

/**
 * MiniDom `DocumentType` wrapper.
 *
 * @since 0.0.0
 * @category model
 */
export interface DocumentType extends Node {
  readonly nodeType: typeof NodeType.DocumentType
  readonly name: string
  readonly publicId: string
  readonly systemId: string
}

/**
 * MiniDom `Element` wrapper with Effect-powered attribute accessors.
 *
 * @since 0.0.0
 * @category model
 */
export interface Element extends Node, ParentNode, ChildNode {
  readonly nodeType: typeof NodeType.Element
  readonly namespaceURI: Namespace
  readonly localName: string
  readonly prefix: string | null
  readonly tagName: string
  readonly attributes: AttributeBagView
}

/**
 * MiniDom `DocumentFragment` wrapper.
 *
 * @since 0.0.0
 * @category model
 */
export interface DocumentFragment extends Node, ParentNode, ChildNode {
  readonly nodeType: typeof NodeType.DocumentFragment
  readonly nodeName: "#document-fragment"
}

/**
 * MiniDom `Document` wrapper with asynchronous factory helpers.
 *
 * @since 0.0.0
 * @category model
 */
export interface Document extends Node, ParentNode {
  readonly nodeType: typeof NodeType.Document
  readonly contentType: string
  readonly URL: string
  readonly documentElement: Element | null
  readonly createElementNS: (namespace: Namespace, qualifiedName: string) => MiniDomEffect<Element>
  readonly createTextNode: (data: string) => MiniDomEffect<Text>
  readonly createComment: (data: string) => MiniDomEffect<Comment>
  readonly createProcessingInstruction: (target: string, data: string) => MiniDomEffect<ProcessingInstruction>
  readonly createDocumentFragment: () => MiniDomEffect<DocumentFragment>
  readonly createDocumentType: (
    name: string,
    options?: { readonly publicId?: string; readonly systemId?: string }
  ) => MiniDomEffect<DocumentType>
}
