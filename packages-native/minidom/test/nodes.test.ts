import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import * as MiniDom from "@effect-native/minidom"

const effectVoid = Effect.void

const makeElement = (
  namespaceURI: MiniDom.Namespace.Namespace,
  tagName: string,
  ownerDocument: MiniDom.Document | null = null
): MiniDom.Element => ({
  nodeType: MiniDom.NodeType.Element,
  nodeName: tagName,
  ownerDocument,
  parentNode: null,
  previousSibling: null,
  nextSibling: null,
  textContent: null,
  clone: () => Effect.sync(() => makeElement(namespaceURI, tagName, ownerDocument)),
  before: () => effectVoid,
  after: () => effectVoid,
  replaceWith: () => effectVoid,
  remove: () => effectVoid,
  childNodes: [],
  children: [],
  firstChild: null,
  lastChild: null,
  append: () => effectVoid,
  prepend: () => effectVoid,
  replaceChildren: () => effectVoid,
  namespaceURI,
  localName: tagName,
  prefix: null,
  tagName,
  attributes: MiniDom.AttributeBag.viewFromEntries([])
})

const makeDocument = (): MiniDom.Document => {
  const makeTextNode = (doc: MiniDom.Document, data: string): MiniDom.Text => ({
    nodeType: MiniDom.NodeType.Text,
    nodeName: "#text" as const,
    ownerDocument: doc,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: data,
    clone: () => Effect.sync(() => makeTextNode(doc, data)),
    before: () => effectVoid,
    after: () => effectVoid,
    replaceWith: () => effectVoid,
    remove: () => effectVoid,
    data,
    length: data.length,
    substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count))
  })

  const makeCommentNode = (doc: MiniDom.Document, data: string): MiniDom.Comment => ({
    nodeType: MiniDom.NodeType.Comment,
    nodeName: "#comment" as const,
    ownerDocument: doc,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: data,
    clone: () => Effect.sync(() => makeCommentNode(doc, data)),
    before: () => effectVoid,
    after: () => effectVoid,
    replaceWith: () => effectVoid,
    remove: () => effectVoid,
    data,
    length: data.length,
    substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count))
  })

  const makeProcessingInstructionNode = (
    doc: MiniDom.Document,
    target: string,
    data: string
  ): MiniDom.ProcessingInstruction => ({
    nodeType: MiniDom.NodeType.ProcessingInstruction,
    nodeName: target,
    ownerDocument: doc,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: data,
    clone: () => Effect.sync(() => makeProcessingInstructionNode(doc, target, data)),
    before: () => effectVoid,
    after: () => effectVoid,
    replaceWith: () => effectVoid,
    remove: () => effectVoid,
    data,
    length: data.length,
    substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count)),
    target
  })

  const makeFragmentNode = (doc: MiniDom.Document): MiniDom.DocumentFragment => ({
    nodeType: MiniDom.NodeType.DocumentFragment,
    nodeName: "#document-fragment" as const,
    ownerDocument: doc,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: null,
    clone: () => Effect.sync(() => makeFragmentNode(doc)),
    childNodes: [],
    children: [],
    firstChild: null,
    lastChild: null,
    append: () => effectVoid,
    prepend: () => effectVoid,
    replaceChildren: () => effectVoid,
    before: () => effectVoid,
    after: () => effectVoid,
    replaceWith: () => effectVoid,
    remove: () => effectVoid
  })

  const makeDocumentTypeNode = (
    doc: MiniDom.Document,
    name: string,
    options?: { readonly publicId?: string; readonly systemId?: string }
  ): MiniDom.DocumentType => ({
    nodeType: MiniDom.NodeType.DocumentType,
    nodeName: name,
    ownerDocument: doc,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: null,
    clone: () => Effect.sync(() => makeDocumentTypeNode(doc, name, options)),
    name,
    publicId: options?.publicId ?? "",
    systemId: options?.systemId ?? ""
  })

  const document: MiniDom.Document = {
    nodeType: MiniDom.NodeType.Document,
    nodeName: "#document",
    ownerDocument: null,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: null,
    clone: () => Effect.sync(() => makeDocument()),
    childNodes: [],
    children: [],
    firstChild: null,
    lastChild: null,
    append: () => effectVoid,
    prepend: () => effectVoid,
    replaceChildren: () => effectVoid,
    contentType: "text/html",
    URL: "https://example.org",
    documentElement: null,
    createElementNS: (namespace, qualifiedName) => Effect.sync(() => makeElement(namespace, qualifiedName, document)),
    createTextNode: (data) => Effect.sync(() => makeTextNode(document, data)),
    createComment: (data) => Effect.sync(() => makeCommentNode(document, data)),
    createProcessingInstruction: (target, data) =>
      Effect.sync(() => makeProcessingInstructionNode(document, target, data)),
    createDocumentFragment: () => Effect.sync(() => makeFragmentNode(document)),
    createDocumentType: (name, options) => Effect.sync(() => makeDocumentTypeNode(document, name, options))
  }

  return document
}

describe("MiniDom NodeType", () => {
  it("matches modern DOM numeric node types", () => {
    assert.strictEqual(MiniDom.NodeType.Element, 1)
    assert.strictEqual(MiniDom.NodeType.Text, 3)
    assert.strictEqual(MiniDom.NodeType.Document, 9)
    assert.strictEqual(MiniDom.NodeType.DocumentFragment, 11)
  })
})

describe("MiniDom namespace-aware interfaces", () => {
  it.effect("creates elements using effectful document factories", () =>
    Effect.gen(function*() {
      const document = makeDocument()
      const element = yield* document.createElementNS("http://www.w3.org/1999/xhtml", "div")
      assert.strictEqual(element.namespaceURI, "http://www.w3.org/1999/xhtml")
      assert.strictEqual(element.tagName, "div")
      assert.strictEqual(Array.from(element.attributes.entries()).length, 0)
    }))
})
