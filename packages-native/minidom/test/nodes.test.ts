import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import * as MiniDom from "@effect-native/minidom"

const effectVoid = Effect.void

const makeElement = (
  namespaceURI: MiniDom.Namespace.Namespace,
  tagName: string
): MiniDom.Element => {
  const attributes = MiniDom.AttributeBag.viewFromEntries([])
  const children: MiniDom.Element[] = []
  const childNodes: MiniDom.Node[] = []

  const element: MiniDom.Element = {
    nodeType: MiniDom.NodeType.Element,
    nodeName: tagName,
    ownerDocument: null,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: null,
    clone: () => Effect.sync(() => element),
    before: () => effectVoid,
    after: () => effectVoid,
    replaceWith: () => effectVoid,
    remove: () => effectVoid,
    childNodes,
    children,
    firstChild: null,
    lastChild: null,
    append: () => effectVoid,
    prepend: () => effectVoid,
    replaceChildren: () => effectVoid,
    namespaceURI,
    localName: tagName,
    prefix: null,
    tagName,
    attributes
  }

  return element
}

const makeDocument = (): MiniDom.Document => {
  const createElementNS = (namespace: MiniDom.Namespace.Namespace, qualifiedName: string) =>
    Effect.sync(() => makeElement(namespace, qualifiedName))

  const document: MiniDom.Document = {
    nodeType: MiniDom.NodeType.Document,
    nodeName: "#document",
    ownerDocument: null,
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: null,
    clone: () => Effect.sync(() => document),
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
    createElementNS,
    createTextNode: (data) =>
      Effect.sync(() => ({
        nodeType: MiniDom.NodeType.Text,
        nodeName: "#text" as const,
        ownerDocument: document,
        parentNode: null,
        previousSibling: null,
        nextSibling: null,
        textContent: data,
        clone: () => Effect.sync(() => document.createTextNode(data)),
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
        data,
        length: data.length,
        substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count))
      } satisfies MiniDom.Text)),
    createComment: (data) =>
      Effect.sync(() => ({
        nodeType: MiniDom.NodeType.Comment,
        nodeName: "#comment" as const,
        ownerDocument: document,
        parentNode: null,
        previousSibling: null,
        nextSibling: null,
        textContent: data,
        clone: () => Effect.sync(() => document.createComment(data)),
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
        data,
        length: data.length,
        substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count))
      } satisfies MiniDom.Comment)),
    createProcessingInstruction: (target, data) =>
      Effect.sync(() => ({
        nodeType: MiniDom.NodeType.ProcessingInstruction,
        nodeName: target,
        ownerDocument: document,
        parentNode: null,
        previousSibling: null,
        nextSibling: null,
        textContent: data,
        clone: () => Effect.sync(() => document.createProcessingInstruction(target, data)),
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
        data,
        length: data.length,
        substringData: (offset, count) => Effect.sync(() => data.substring(offset, offset + count)),
        target
      } satisfies MiniDom.ProcessingInstruction)),
    createDocumentFragment: () =>
      Effect.sync(() => ({
        nodeType: MiniDom.NodeType.DocumentFragment,
        nodeName: "#document-fragment" as const,
        ownerDocument: document,
        parentNode: null,
        previousSibling: null,
        nextSibling: null,
        textContent: null,
        clone: () => Effect.sync(() => document.createDocumentFragment()),
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
      } satisfies MiniDom.DocumentFragment)),
    createDocumentType: (name, options) =>
      Effect.sync(() => ({
        nodeType: MiniDom.NodeType.DocumentType,
        nodeName: name,
        ownerDocument: document,
        parentNode: null,
        previousSibling: null,
        nextSibling: null,
        textContent: null,
        clone: () => Effect.sync(() => document.createDocumentType(name, options)),
        name,
        publicId: options?.publicId ?? "",
        systemId: options?.systemId ?? ""
      } satisfies MiniDom.DocumentType))
  }

  return document
}

describe("MiniDom NodeType", () => {
  it("matches modern DOM numeric node types", () => {
    expect(MiniDom.NodeType.Element).toBe(1)
    expect(MiniDom.NodeType.Text).toBe(3)
    expect(MiniDom.NodeType.Document).toBe(9)
    expect(MiniDom.NodeType.DocumentFragment).toBe(11)
  })
})

describe("MiniDom namespace-aware interfaces", () => {
  it.effect("creates elements using effectful document factories", () =>
    Effect.gen(function*() {
      const document = makeDocument()
      const element = yield* document.createElementNS("http://www.w3.org/1999/xhtml", "div")
      expect(element.namespaceURI).toBe("http://www.w3.org/1999/xhtml")
      expect(element.tagName).toBe("div")
      expect(Array.from(element.attributes.entries())).toHaveLength(0)
    }))
})
