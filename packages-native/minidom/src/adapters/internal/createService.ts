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

type WrappedNode = Nodes.Node & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedElement = Nodes.Element & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedDocument = Nodes.Document & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedCharacterData = Nodes.CharacterData & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedDocumentFragment = Nodes.DocumentFragment & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedDocumentType = Nodes.DocumentType & { readonly [NativeNodeSymbol]: NativeNode }

type WrappedProcessingInstruction = Nodes.ProcessingInstruction & { readonly [NativeNodeSymbol]: NativeNode }

const isMiniDomError = MiniDomError.MiniDomError.is

const isWrappedNode = (value: unknown): value is WrappedNode =>
  typeof value === "object" && value !== null && NativeNodeSymbol in value

const markNode = <A extends Nodes.Node>(wrapper: A, node: NativeNode): A & { readonly [NativeNodeSymbol]: NativeNode } => {
  Object.defineProperty(wrapper, NativeNodeSymbol, {
    value: node,
    enumerable: false,
    configurable: false,
    writable: false
  })
  return wrapper as A & { readonly [NativeNodeSymbol]: NativeNode }
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
  wrapNode: (node: NativeNode) => WrappedNode | null,
  node: NativeNode
): Nodes.Element | Nodes.Document | Nodes.DocumentFragment | null => {
  const parent = node.parentNode
  if (!parent) {
    return null
  }
  const wrapped = wrapNode(parent)
  if (!wrapped) {
    return null
  }
  switch (parent.nodeType) {
    case nodeCtor.DOCUMENT_NODE:
      return wrapped as Nodes.Document
    case nodeCtor.DOCUMENT_FRAGMENT_NODE:
      return wrapped as Nodes.DocumentFragment
    case nodeCtor.ELEMENT_NODE:
      return wrapped as Nodes.Element
    default:
      return null
  }
}

const wrapChildArray = (wrapNode: (node: NativeNode) => WrappedNode | null, list: NodeListOf<ChildNode>): ReadonlyArray<Nodes.Node> =>
  Array.from(list)
    .map((child) => wrapNode(child)!)
    .filter((child): child is WrappedNode => child !== null)

const wrapElementArray = (
  wrapNode: (node: NativeNode) => WrappedNode | null,
  list: HTMLCollectionOf<Element>
): ReadonlyArray<Nodes.Element> =>
  Array.from(list)
    .map((child) => wrapNode(child)!)
    .filter((child): child is Nodes.Element => child !== null && child.nodeType === Nodes.NodeType.Element)

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
    nodeType: Nodes.NodeType.Element as const,
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
        }).pipe(Effect.asVoid)
      ),
    after: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.after", () => {
          element.after(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceWith: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.replaceWith", () => {
          element.replaceWith(...inputs)
        }).pipe(Effect.asVoid)
      ),
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
        }).pipe(Effect.asVoid)
      ),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
        runOperation("Element.prepend", () => {
          element.prepend(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(element.ownerDocument!, nodes), (inputs) =>
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
      return node.ownerDocument ? (wrapNode(node.ownerDocument) as Nodes.Document) : null
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
        }).pipe(Effect.asVoid)
      ),
    after: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(node.ownerDocument!, nodes), (inputs) =>
        runOperation(`${description}.after`, () => {
          node.after(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceWith: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(node.ownerDocument!, nodes), (inputs) =>
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
    get nodeName() {
      return fragment.nodeName
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
    before: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
        runOperation("DocumentFragment.before", () => {
          fragment.before(...inputs)
        }).pipe(Effect.asVoid)
      ),
    after: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
        runOperation("DocumentFragment.after", () => {
          fragment.after(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceWith: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
        runOperation("DocumentFragment.replaceWith", () => {
          fragment.replaceWith(...inputs)
        }).pipe(Effect.asVoid)
      ),
    remove: () =>
      runOperation("DocumentFragment.remove", () => {
        fragment.remove()
      }).pipe(Effect.asVoid),
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
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
        runOperation("DocumentFragment.append", () => {
          fragment.append(...inputs)
        }).pipe(Effect.asVoid)
      ),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
        runOperation("DocumentFragment.prepend", () => {
          fragment.prepend(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(fragment.ownerDocument!, nodes), (inputs) =>
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
  wrapDocument: (doc: Document) => WrappedDocument
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
        }).pipe(Effect.asVoid)
      ),
    prepend: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(document, nodes), (inputs) =>
        runOperation("Document.prepend", () => {
          document.prepend(...inputs)
        }).pipe(Effect.asVoid)
      ),
    replaceChildren: (...nodes: ReadonlyArray<Nodes.Node | string>) =>
      Effect.flatMap(unwrapInput(document, nodes), (inputs) =>
        runOperation("Document.replaceChildren", () => {
          document.replaceChildren(...inputs)
        }).pipe(Effect.asVoid)
      ),
    contentType: document.contentType,
    URL: document.URL,
    get documentElement() {
      return document.documentElement ? (wrapNode(document.documentElement) as Nodes.Element) : null
    },
    createElementNS: (namespace: string | null, qualifiedName: string) =>
      Effect.map(
        runOperation("Document.createElementNS", () =>
          wrapNode(document.createElementNS(namespace, qualifiedName) as Element)
        ),
        (node) => node as Nodes.Element
      ),
    createTextNode: (data: string) =>
      Effect.map(
        runOperation("Document.createTextNode", () => wrapNode(document.createTextNode(data))),
        (node) => node as Nodes.Text
      ),
    createComment: (data: string) =>
      Effect.map(
        runOperation("Document.createComment", () => wrapNode(document.createComment(data))),
        (node) => node as Nodes.Comment
      ),
    createProcessingInstruction: (target: string, data: string) =>
      Effect.map(
        runOperation("Document.createProcessingInstruction", () =>
          wrapNode(document.createProcessingInstruction(target, data))
        ),
        (node) => node as Nodes.ProcessingInstruction
      ),
    createDocumentFragment: () =>
      Effect.map(
        runOperation("Document.createDocumentFragment", () => wrapNode(document.createDocumentFragment())),
        (node) => node as Nodes.DocumentFragment
      ),
    createDocumentType: (name: string, options?: { readonly publicId?: string; readonly systemId?: string }) =>
      Effect.map(
        runOperation("Document.createDocumentType", () => {
          const type = document.implementation.createDocumentType(
            name,
            options?.publicId ?? "",
            options?.systemId ?? ""
          )
          return wrapNode(type)
        }),
        (node) => node as Nodes.DocumentType
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
): WrappedCharacterData => {
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
): WrappedCharacterData => {
  const base = defineCharacterData(nodeCtor, node, wrapNode, "Comment")
  const wrapper: Nodes.Comment = {
    ...base,
    nodeType: Nodes.NodeType.Comment,
    nodeName: "#comment"
  }
  return markNode(wrapper, node)
}

const createWrapNode = (window: Window) => {
  const cache = new WeakMap<NativeNode, WrappedNode>()
  const NodeCtor = window.Node

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

  const wrapNode = (node: NativeNode): WrappedNode => {
    const existing = cache.get(node)
    if (existing) {
      return existing
    }

    let wrapped: WrappedNode
    switch (node.nodeType) {
      case NodeCtor.DOCUMENT_NODE: {
        wrapped = wrapDocument(node as Document)
        break
      }
      case NodeCtor.ELEMENT_NODE: {
        const elementWrapper = defineElement(NodeCtor, node as Element, wrapNode, wrapDocument)
        cache.set(node, elementWrapper)
        wrapped = elementWrapper
        break
      }
      case NodeCtor.TEXT_NODE: {
        const textWrapper = wrapText(NodeCtor, node as Text, wrapNode)
        cache.set(node, textWrapper)
        wrapped = textWrapper
        break
      }
      case NodeCtor.COMMENT_NODE: {
        const commentWrapper = wrapComment(NodeCtor, node as Comment, wrapNode)
        cache.set(node, commentWrapper)
        wrapped = commentWrapper
        break
      }
      case NodeCtor.PROCESSING_INSTRUCTION_NODE: {
        const piWrapper = wrapProcessingInstruction(NodeCtor, node as ProcessingInstruction, wrapNode)
        cache.set(node, piWrapper)
        wrapped = piWrapper
        break
      }
      case NodeCtor.DOCUMENT_FRAGMENT_NODE: {
        const fragmentWrapper = defineDocumentFragment(NodeCtor, node as DocumentFragment, wrapNode, wrapDocument)
        cache.set(node, fragmentWrapper)
        wrapped = fragmentWrapper
        break
      }
      case NodeCtor.DOCUMENT_TYPE_NODE: {
        const docTypeWrapper = defineDocumentType(NodeCtor, node as DocumentType, wrapNode, wrapDocument)
        cache.set(node, docTypeWrapper)
        wrapped = docTypeWrapper
        break
      }
      default: {
        throw new MiniDomError.Unsupported({
          message: `Unsupported node type: ${node.nodeType}`
        })
      }
    }

    return wrapped
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
  const { wrapNode, wrapDocument } = createWrapNode(window)
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
