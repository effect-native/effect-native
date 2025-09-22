/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"

import * as AttributeBag from "../../core/AttributeBag.js"
import * as MiniDomError from "../../core/MiniDomError.js"
import * as Nodes from "../../core/Nodes.js"
import type { Service as MiniDomService } from "../../core/Service.js"
import * as Sync from "../../core/Sync.js"

const NativeNodeSymbol: unique symbol = Symbol.for("@effect-native/minidom/adapter/NativeNode")

type NativeNode = Node

type WrappedBase<A extends Nodes.Node> = A & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedElement = WrappedBase<Nodes.Element>

type WrappedDocument = WrappedBase<Nodes.Document>

type WrappedCharacterData = WrappedBase<Nodes.CharacterData>

type WrappedDocumentFragment = WrappedBase<Nodes.DocumentFragment>

type WrappedDocumentType = WrappedBase<Nodes.DocumentType>

type WrappedText = WrappedBase<Nodes.Text>

type WrappedComment = WrappedBase<Nodes.Comment>

type WrappedProcessingInstruction = WrappedBase<Nodes.ProcessingInstruction>

type WrappedNode =
  | WrappedElement
  | WrappedDocument
  | WrappedText
  | WrappedComment
  | WrappedProcessingInstruction
  | WrappedDocumentFragment
  | WrappedDocumentType

const isWrappedDocument = (node: WrappedNode): node is WrappedDocument => node.nodeType === Nodes.NodeType.Document

const isWrappedElement = (node: WrappedNode): node is WrappedElement => node.nodeType === Nodes.NodeType.Element

const isWrappedDocumentFragment = (node: WrappedNode): node is WrappedDocumentFragment =>
  node.nodeType === Nodes.NodeType.DocumentFragment

const isWrappedProcessingInstruction = (node: WrappedNode): node is WrappedProcessingInstruction =>
  node.nodeType === Nodes.NodeType.ProcessingInstruction

const ensureDocument = (node: WrappedNode): WrappedDocument => {
  if (!isWrappedDocument(node)) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped document" })
  }
  return node
}

const ensureElement = (node: WrappedNode): WrappedElement => {
  if (!isWrappedElement(node)) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped element" })
  }
  return node
}

const ensureText = (node: WrappedNode): WrappedText => {
  if (node.nodeType !== Nodes.NodeType.Text) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped text" })
  }
  return node as WrappedText
}

const ensureComment = (node: WrappedNode): WrappedComment => {
  if (node.nodeType !== Nodes.NodeType.Comment) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped comment" })
  }
  return node as WrappedComment
}

const ensureProcessingInstruction = (node: WrappedNode): WrappedProcessingInstruction => {
  if (!isWrappedProcessingInstruction(node)) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped processing instruction" })
  }
  return node
}

const ensureDocumentFragment = (node: WrappedNode): WrappedDocumentFragment => {
  if (!isWrappedDocumentFragment(node)) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped document fragment" })
  }
  return node
}

const ensureDocumentType = (node: WrappedNode): WrappedDocumentType => {
  if (node.nodeType !== Nodes.NodeType.DocumentType) {
    throw new MiniDomError.BackendFailure({ message: "Expected wrapped document type" })
  }
  return node as WrappedDocumentType
}

const isMiniDomError = MiniDomError.MiniDomError.is

const isWrappedNode = (value: unknown): value is WrappedNode =>
  typeof value === "object" && value !== null && NativeNodeSymbol in value

const markNode = <A extends Nodes.Node>(wrapper: A, node: NativeNode): WrappedBase<A> => {
  Object.defineProperty(wrapper, NativeNodeSymbol, {
    value: node,
    enumerable: false,
    configurable: false,
    writable: false
  })
  return wrapper as WrappedBase<A>
}

const attributeEntries = (element: Element): ReadonlyArray<AttributeBag.AttributeEntry> => {
  const entries: Array<AttributeBag.AttributeEntry> = []
  for (const attr of Array.from(element.attributes)) {
    entries.push([attr.namespaceURI, attr.name, attr.value])
  }
  return entries
}

const runOperation = <A>(description: string, operation: () => A) =>
  Effect.try({
    try: operation,
    catch: (cause) => (isMiniDomError(cause) ? cause : new MiniDomError.BackendFailure({ message: description, cause }))
  })

const parentFor = (
  nodeCtor: typeof Node,
  wrapNode: (node: NativeNode) => WrappedNode,
  node: NativeNode
): Nodes.Element | Nodes.Document | Nodes.DocumentFragment | null => {
  const parent = node.parentNode
  if (!parent) {
    return null
  }
  const wrapped = wrapNode(parent)
  switch (parent.nodeType) {
    case nodeCtor.DOCUMENT_NODE:
      return isWrappedDocument(wrapped) ? wrapped : null
    case nodeCtor.DOCUMENT_FRAGMENT_NODE:
      return isWrappedDocumentFragment(wrapped) ? wrapped : null
    case nodeCtor.ELEMENT_NODE:
      return isWrappedElement(wrapped) ? wrapped : null
    default:
      return null
  }
}

const wrapChildArray = (
  wrapNode: (node: NativeNode) => WrappedNode,
  list: NodeListOf<ChildNode>
): ReadonlyArray<Nodes.Node> => Array.from(list, (child) => wrapNode(child))

const wrapElementArray = (
  wrapNode: (node: NativeNode) => WrappedNode,
  list: HTMLCollectionOf<Element>
): ReadonlyArray<Nodes.Element> => Array.from(list, (child) => wrapNode(child)).filter(isWrappedElement)

const unwrapInput = <Inputs extends ReadonlyArray<Nodes.Node | string>>(
  document: Document,
  values: Inputs
): Effect.Effect<Array<Node | string>, MiniDomError.Unsupported> =>
  Effect.try({
    try: () =>
      values.map((value) => {
        if (typeof value === "string") {
          return value
        }
        if (!isWrappedNode(value)) {
          throw new MiniDomError.Unsupported({
            message: "MiniDom adapter received an unknown node implementation"
          })
        }
        const native = value[NativeNodeSymbol]
        if (native.ownerDocument === document || native.ownerDocument === null) {
          return native
        }
        return document.importNode(native, true)
      }),
    catch: (cause) => cause as MiniDomError.Unsupported
  })

const defineElement = (
  nodeCtor: typeof Node,
  element: Element,
  wrapNode: (node: NativeNode) => WrappedNode,
  wrapDocument: (doc: Document) => WrappedDocument
): WrappedElement => {
  const withAttributes = {
    nodeType: Nodes.NodeType.Element,
    get nodeName() {
      return element.nodeName
    },
    get ownerDocument() {
      return element.ownerDocument ? wrapDocument(element.ownerDocument) : null
    },
    get parentNode() {
      return parentFor(nodeCtor, wrapNode, element)
    },
    get previousSibling() {
      return element.previousSibling ? wrapNode(element.previousSibling) : null
    },
    get nextSibling() {
      return element.nextSibling ? wrapNode(element.nextSibling) : null
    },
    get textContent() {
      return element.textContent
    },
    clone: (options?: { readonly deep?: boolean }) =>
      runOperation("Element.clone", () => wrapNode(element.cloneNode(options?.deep ?? false))),
    before: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.before", () => {
          element.before(...inputs)
        }).pipe(Effect.asVoid)),
    after: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.after", () => {
          element.after(...inputs)
        }).pipe(Effect.asVoid)),
    replaceWith: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.replaceWith", () => {
          element.replaceWith(...inputs)
        }).pipe(Effect.asVoid)),
    remove: () =>
      runOperation("Element.remove", () => {
        element.remove()
      }).pipe(Effect.asVoid),
    get childNodes() {
      return wrapChildArray(wrapNode, element.childNodes)
    },
    get children() {
      return wrapElementArray(wrapNode, element.children)
    },
    get firstChild() {
      return element.firstChild ? wrapNode(element.firstChild) : null
    },
    get lastChild() {
      return element.lastChild ? wrapNode(element.lastChild) : null
    },
    append: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.append", () => {
          element.append(...inputs)
        }).pipe(Effect.asVoid)),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.prepend", () => {
          element.prepend(...inputs)
        }).pipe(Effect.asVoid)),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(
        unwrapInput(element.ownerDocument!, nodes),
        (inputs) =>
          runOperation("Element.replaceChildren", () => {
            element.replaceChildren(...inputs)
          }).pipe(Effect.asVoid)
      ),
    get namespaceURI() {
      return element.namespaceURI
    },
    get localName() {
      return element.localName
    },
    get prefix() {
      return element.prefix
    },
    get tagName() {
      return element.tagName
    },
    get attributes() {
      return AttributeBag.viewFromEntries(attributeEntries(element))
    }
  }

  return markNode(withAttributes, element)
}

const defineCharacterData = <T extends Text | Comment | ProcessingInstruction>(
  nodeCtor: typeof Node,
  node: T,
  wrapNode: (value: NativeNode) => WrappedNode,
  description: string
): WrappedCharacterData => {
  const result: Nodes.CharacterData = {
    nodeType: node.nodeType as Nodes.NodeType,
    get nodeName() {
      return node.nodeName
    },
    get ownerDocument() {
      const owner = node.ownerDocument
      return owner ? ensureDocument(wrapNode(owner)) : null
    },
    get parentNode() {
      return parentFor(nodeCtor, wrapNode, node)
    },
    get previousSibling() {
      return node.previousSibling ? wrapNode(node.previousSibling) : null
    },
    get nextSibling() {
      return node.nextSibling ? wrapNode(node.nextSibling) : null
    },
    get textContent() {
      return node.textContent
    },
    clone: (options?: { readonly deep?: boolean }) =>
      runOperation(`${description}.clone`, () => wrapNode(node.cloneNode(options?.deep ?? false))),
    before: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(node.ownerDocument!, nodes), (inputs) =>
        runOperation(`${description}.before`, () => {
          node.before(...inputs)
        }).pipe(Effect.asVoid)),
    after: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(node.ownerDocument!, nodes), (inputs) =>
        runOperation(`${description}.after`, () => {
          node.after(...inputs)
        }).pipe(Effect.asVoid)),
    replaceWith: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(
        unwrapInput(node.ownerDocument!, nodes),
        (inputs) =>
          runOperation(`${description}.replaceWith`, () => {
            node.replaceWith(...inputs)
          }).pipe(Effect.asVoid)
      ),
    remove: () =>
      runOperation(`${description}.remove`, () => {
        node.remove()
      }).pipe(Effect.asVoid),
    get data() {
      return node.data
    },
    get length() {
      return node.length
    },
    substringData: (offset: number, count: number) =>
      runOperation(`${description}.substringData`, () => node.substringData(offset, count))
  }

  return markNode(result, node)
}

const defineDocumentFragment = (
  nodeCtor: typeof Node,
  fragment: DocumentFragment,
  wrapNode: (node: NativeNode) => WrappedNode,
  wrapDocument: (doc: Document) => WrappedDocument
): WrappedDocumentFragment => {
  const wrapper: Nodes.DocumentFragment = {
    nodeType: Nodes.NodeType.DocumentFragment,
    get nodeName(): "#document-fragment" {
      return "#document-fragment"
    },
    get ownerDocument() {
      return fragment.ownerDocument ? wrapDocument(fragment.ownerDocument) : null
    },
    get parentNode() {
      return parentFor(nodeCtor, wrapNode, fragment)
    },
    get previousSibling() {
      return fragment.previousSibling ? wrapNode(fragment.previousSibling) : null
    },
    get nextSibling() {
      return fragment.nextSibling ? wrapNode(fragment.nextSibling) : null
    },
    get textContent() {
      return fragment.textContent
    },
    clone: (options?: { readonly deep?: boolean }) =>
      runOperation("DocumentFragment.clone", () => wrapNode(fragment.cloneNode(options?.deep ?? false))),
    before: (..._nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.fail(
        new MiniDomError.Unsupported({ message: "DocumentFragment.before is not supported" })
      ),
    after: (..._nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.fail(
        new MiniDomError.Unsupported({ message: "DocumentFragment.after is not supported" })
      ),
    replaceWith: (..._nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.fail(
        new MiniDomError.Unsupported({ message: "DocumentFragment.replaceWith is not supported" })
      ),
    remove: () => Effect.fail(new MiniDomError.Unsupported({ message: "DocumentFragment.remove is not supported" })),
    get childNodes() {
      return wrapChildArray(wrapNode, fragment.childNodes)
    },
    get children() {
      return wrapElementArray(wrapNode, fragment.children as unknown as HTMLCollectionOf<Element>)
    },
    get firstChild() {
      return fragment.firstChild ? wrapNode(fragment.firstChild) : null
    },
    get lastChild() {
      return fragment.lastChild ? wrapNode(fragment.lastChild) : null
    },
    append: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(
        unwrapInput(fragment.ownerDocument!, nodes),
        (inputs) =>
          runOperation("DocumentFragment.append", () => {
            fragment.append(...inputs)
          }).pipe(Effect.asVoid)
      ),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(
        unwrapInput(fragment.ownerDocument!, nodes),
        (inputs) =>
          runOperation("DocumentFragment.prepend", () => {
            fragment.prepend(...inputs)
          }).pipe(Effect.asVoid)
      ),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(
        unwrapInput(fragment.ownerDocument!, nodes),
        (inputs) =>
          runOperation("DocumentFragment.replaceChildren", () => {
            fragment.replaceChildren(...inputs)
          }).pipe(Effect.asVoid)
      )
  }

  return markNode(wrapper, fragment)
}

const defineDocumentType = (
  nodeCtor: typeof Node,
  docType: DocumentType,
  wrapNode: (node: NativeNode) => WrappedNode,
  wrapDocument: (doc: Document) => WrappedDocument
): WrappedDocumentType => {
  const wrapper: Nodes.DocumentType = {
    nodeType: Nodes.NodeType.DocumentType,
    get nodeName() {
      return docType.nodeName
    },
    get ownerDocument() {
      return docType.ownerDocument ? wrapDocument(docType.ownerDocument) : null
    },
    get parentNode() {
      return parentFor(nodeCtor, wrapNode, docType)
    },
    get previousSibling() {
      return docType.previousSibling ? wrapNode(docType.previousSibling) : null
    },
    get nextSibling() {
      return docType.nextSibling ? wrapNode(docType.nextSibling) : null
    },
    get textContent() {
      return docType.textContent
    },
    clone: (options?: { readonly deep?: boolean }) =>
      runOperation("DocumentType.clone", () => wrapNode(docType.cloneNode(options?.deep ?? false))),
    name: docType.name,
    publicId: docType.publicId,
    systemId: docType.systemId
  }

  return markNode(wrapper, docType)
}

const defineDocument = (
  document: Document,
  wrapNode: (node: NativeNode) => WrappedNode,
  _wrapDocument: (doc: Document) => WrappedDocument
): WrappedDocument => {
  const wrapper: Nodes.Document = {
    nodeType: Nodes.NodeType.Document,
    get nodeName() {
      return "#document"
    },
    get ownerDocument() {
      return null
    },
    get parentNode() {
      return null
    },
    get previousSibling() {
      return null
    },
    get nextSibling() {
      return null
    },
    get textContent() {
      return document.textContent
    },
    clone: (options?: { readonly deep?: boolean }) =>
      runOperation("Document.clone", () => wrapNode(document.cloneNode(options?.deep ?? false))),
    get childNodes() {
      return wrapChildArray(wrapNode, document.childNodes)
    },
    get children() {
      return wrapElementArray(wrapNode, document.children as unknown as HTMLCollectionOf<Element>)
    },
    get firstChild() {
      return document.firstChild ? wrapNode(document.firstChild) : null
    },
    get lastChild() {
      return document.lastChild ? wrapNode(document.lastChild) : null
    },
    append: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(document, nodes), (inputs) =>
        runOperation("Document.append", () => {
          document.append(...inputs)
        }).pipe(Effect.asVoid)),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(document, nodes), (inputs) =>
        runOperation("Document.prepend", () => {
          document.prepend(...inputs)
        }).pipe(Effect.asVoid)),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(document, nodes), (inputs) =>
        runOperation("Document.replaceChildren", () => {
          document.replaceChildren(...inputs)
        }).pipe(Effect.asVoid)),
    contentType: document.contentType,
    URL: document.URL,
    get documentElement() {
      const element = document.documentElement
      return element ? ensureElement(wrapNode(element)) : null
    },
    createElementNS: (namespace: string | null, qualifiedName: string) =>
      Effect.map(
        runOperation<WrappedElement>("Document.createElementNS", () =>
          ensureElement(wrapNode(document.createElementNS(namespace, qualifiedName) as Element))),
        ensureElement
      ),
    createTextNode: (data: string) =>
      Effect.map(
        runOperation<WrappedText>("Document.createTextNode", () => ensureText(wrapNode(document.createTextNode(data)))),
        ensureText
      ),
    createComment: (data: string) =>
      Effect.map(
        runOperation<WrappedComment>("Document.createComment", () =>
          ensureComment(wrapNode(document.createComment(data)))),
        ensureComment
      ),
    createProcessingInstruction: (target: string, data: string) =>
      Effect.map(
        runOperation<WrappedProcessingInstruction>("Document.createProcessingInstruction", () =>
          ensureProcessingInstruction(wrapNode(document.createProcessingInstruction(target, data)))),
        ensureProcessingInstruction
      ),
    createDocumentFragment: () =>
      Effect.map(
        runOperation<WrappedDocumentFragment>("Document.createDocumentFragment", () =>
          ensureDocumentFragment(wrapNode(document.createDocumentFragment()))),
        ensureDocumentFragment
      ),
    createDocumentType: (name: string, options?: { readonly publicId?: string; readonly systemId?: string }) =>
      Effect.map(
        runOperation<WrappedDocumentType>("Document.createDocumentType", () => {
          const type = document.implementation.createDocumentType(
            name,
            options?.publicId ?? "",
            options?.systemId ?? ""
          )
          return ensureDocumentType(wrapNode(type))
        }),
        ensureDocumentType
      )
  }

  return markNode(wrapper, document)
}

const wrapProcessingInstruction = (
  nodeCtor: typeof Node,
  node: ProcessingInstruction,
  wrapNode: (value: NativeNode) => WrappedNode
): WrappedProcessingInstruction => {
  const base = defineCharacterData(nodeCtor, node, wrapNode, "ProcessingInstruction")
  const wrapper: Nodes.ProcessingInstruction = {
    ...base,
    nodeType: Nodes.NodeType.ProcessingInstruction,
    get nodeName() {
      return node.nodeName
    },
    get target() {
      return node.target
    }
  }
  return markNode(wrapper, node)
}

const wrapText = (
  nodeCtor: typeof Node,
  node: Text,
  wrapNode: (value: NativeNode) => WrappedNode
): WrappedText => {
  const base = defineCharacterData(nodeCtor, node, wrapNode, "Text")
  const wrapper: Nodes.Text = {
    ...base,
    nodeType: Nodes.NodeType.Text,
    nodeName: "#text"
  }
  return markNode(wrapper, node)
}

const wrapComment = (
  nodeCtor: typeof Node,
  node: Comment,
  wrapNode: (value: NativeNode) => WrappedNode
): WrappedComment => {
  const base = defineCharacterData(nodeCtor, node, wrapNode, "Comment")
  const wrapper: Nodes.Comment = {
    ...base,
    nodeType: Nodes.NodeType.Comment,
    nodeName: "#comment"
  }
  return markNode(wrapper, node)
}

const createWrapNode = (_window: Window) => {
  const cache = new WeakMap<NativeNode, WrappedNode>()
  const NodeCtor = (_window as unknown as { Node?: typeof Node }).Node ?? globalThis.Node
  if (!NodeCtor) {
    throw new MiniDomError.Unsupported({ message: "MiniDom adapter requires DOM Node constructor" })
  }

  const wrapDocument = (doc: Document): WrappedDocument => {
    const existing = cache.get(doc)
    if (existing) {
      return existing as WrappedDocument
    }
    const placeholder = {} as unknown as WrappedDocument
    cache.set(doc, placeholder as WrappedNode)
    const defined = defineDocument(doc, wrapNode, wrapDocument)
    cache.set(doc, defined)
    return defined
  }

  function wrapNode(node: Document): WrappedDocument
  function wrapNode(node: Element): WrappedElement
  function wrapNode(node: Text): WrappedText
  function wrapNode(node: Comment): WrappedComment
  function wrapNode(node: ProcessingInstruction): WrappedProcessingInstruction
  function wrapNode(node: DocumentFragment): WrappedDocumentFragment
  function wrapNode(node: DocumentType): WrappedDocumentType
  function wrapNode(node: NativeNode): WrappedNode
  function wrapNode(node: NativeNode): WrappedNode {
    const existing = cache.get(node)
    if (existing) {
      return existing
    }

    switch (node.nodeType) {
      case NodeCtor.DOCUMENT_NODE: {
        return wrapDocument(node as Document)
      }
      case NodeCtor.ELEMENT_NODE: {
        const elementWrapper = defineElement(NodeCtor, node as Element, wrapNode, wrapDocument)
        cache.set(node, elementWrapper)
        return elementWrapper
      }
      case NodeCtor.TEXT_NODE: {
        const textWrapper = wrapText(NodeCtor, node as Text, wrapNode)
        cache.set(node, textWrapper)
        return textWrapper
      }
      case NodeCtor.COMMENT_NODE: {
        const commentWrapper = wrapComment(NodeCtor, node as Comment, wrapNode)
        cache.set(node, commentWrapper)
        return commentWrapper
      }
      case NodeCtor.PROCESSING_INSTRUCTION_NODE: {
        const piWrapper = wrapProcessingInstruction(NodeCtor, node as ProcessingInstruction, wrapNode)
        cache.set(node, piWrapper)
        return piWrapper
      }
      case NodeCtor.DOCUMENT_FRAGMENT_NODE: {
        const fragmentWrapper = defineDocumentFragment(NodeCtor, node as DocumentFragment, wrapNode, wrapDocument)
        cache.set(node, fragmentWrapper)
        return fragmentWrapper
      }
      case NodeCtor.DOCUMENT_TYPE_NODE: {
        const docTypeWrapper = defineDocumentType(NodeCtor, node as DocumentType, wrapNode, wrapDocument)
        cache.set(node, docTypeWrapper)
        return docTypeWrapper
      }
      default: {
        throw new MiniDomError.Unsupported({
          message: `Unsupported node type: ${node.nodeType}`
        })
      }
    }
  }

  return {
    wrapNode,
    wrapDocument
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const createService = (window: Window): MiniDomService => {
  const { wrapDocument } = createWrapNode(window)
  const document = wrapDocument(window.document)

  return {
    window,
    document,
    capabilities: {
      sync: Sync.fromRunner((effect) => Effect.runSync(effect))
    }
  }
}

/**
 * @since 1.0.0
 * @category exports
 */
export const Internal = {
  NativeNodeSymbol,
  createService
}
