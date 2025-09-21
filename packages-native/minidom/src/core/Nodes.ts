/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"

import type { View as AttributeBagView } from "./AttributeBag.js"
import type { Namespace } from "./Namespace.js"

/**
 * @since 1.0.0
 * @category symbols
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
 * @since 1.0.0
 * @category types
 */
export type NodeType = typeof NodeType[keyof typeof NodeType]

/**
 * @since 1.0.0
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
  readonly clone: (options?: { readonly deep?: boolean }) => Effect.Effect<Node>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface ChildNode {
  readonly before: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
  readonly after: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
  readonly replaceWith: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
  readonly remove: () => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface ParentNode {
  readonly childNodes: ReadonlyArray<Node>
  readonly children: ReadonlyArray<Element>
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  readonly append: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
  readonly prepend: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
  readonly replaceChildren: (...nodes: ReadonlyArray<Node | string>) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface CharacterData extends Node, ChildNode {
  readonly data: string
  readonly length: number
  readonly substringData: (offset: number, count: number) => Effect.Effect<string>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Text extends CharacterData {
  readonly nodeType: typeof NodeType.Text
  readonly nodeName: "#text"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Comment extends CharacterData {
  readonly nodeType: typeof NodeType.Comment
  readonly nodeName: "#comment"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface ProcessingInstruction extends CharacterData {
  readonly nodeType: typeof NodeType.ProcessingInstruction
  readonly target: string
}

/**
 * @since 1.0.0
 * @category model
 */
export interface DocumentType extends Node {
  readonly nodeType: typeof NodeType.DocumentType
  readonly name: string
  readonly publicId: string
  readonly systemId: string
}

/**
 * @since 1.0.0
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
 * @since 1.0.0
 * @category model
 */
export interface DocumentFragment extends Node, ParentNode, ChildNode {
  readonly nodeType: typeof NodeType.DocumentFragment
  readonly nodeName: "#document-fragment"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Document extends Node, ParentNode {
  readonly nodeType: typeof NodeType.Document
  readonly contentType: string
  readonly URL: string
  readonly documentElement: Element | null
  readonly createElementNS: (namespace: Namespace, qualifiedName: string) => Effect.Effect<Element>
  readonly createTextNode: (data: string) => Effect.Effect<Text>
  readonly createComment: (data: string) => Effect.Effect<Comment>
  readonly createProcessingInstruction: (target: string, data: string) => Effect.Effect<ProcessingInstruction>
  readonly createDocumentFragment: () => Effect.Effect<DocumentFragment>
  readonly createDocumentType: (
    name: string,
    options?: { readonly publicId?: string; readonly systemId?: string }
  ) => Effect.Effect<DocumentType>
}
