we're going to create a a new package in this monorepo

packages-native/domdb folder
@effect-native/domdb package name

it'll be an Effect.Service
depends on
@effect/sql SqlClient
@effect-native/crsql CrSql

implements the

universal software modeling service
object model
packages-native/universal-data-model folder
@effect-native/universal-data-model package name

---

.claude/commands/new-feature.md
let's start working on a new Effect.Service
that implements a minimal subset

1. define a set of minimal DOM API ts interfaces

2. define a set of concrete layers that map various DOM implementations to our MiniDom interface

3. define a single adapter MiniDom <-> React Reconciler so we can use React with any MiniDom implementation with just a single React Reconciler Host Config



```ts
import { Context, Effect, Layer } from "effect"

interface Element {
  namespaceURI
  nodeName
  nodeType
  nodeValue

  attributes

  parentElement
  childNodes
  childElementCount
  validChildElementNames
  firstElementChild
  nextElementSibling
  insertAdjacentElement
  appendChild
}

class Document extends Context.Tag("MiniDomDocument")<Document, DocumentShape>() {}
class Element extends Context.Tag("MiniDomElement")<Element, ElementShape>() {}
class MiniDom extends Context.Tag("MiniDom")<MiniDom, MiniDomShape>() {
  static Document = Document
  static Element = Element
}
```

require a specific instance

```ts
Effect.gen(function*(){
  const documentElement = yield* MiniDom.Document.documentElement
  const activeElement = yield* MiniDom.Document.activeElement
  const rootElement = yield* MiniDom.Document.rootElement
})
```

```ts
Effect.gen(function*(){
  const document = yield* MiniDom.Document
  const documentElement = yield* document.documentElement
  const activeElement = yield* document.activeElement
  const rootElement = yield* document.rootElement
})
```

```ts
Effect.gen(function*(){
  const window = yield* MiniDom.Window
  const document = yield* window.document

  const documentElement = yield* document.documentElement
  const activeElement = yield* document.activeElement
  const rootElement = yield* document.rootElement

  yield* doStuffWithElement.pipe(Effect.provideService(MiniDom.Element, documentElement))
  yield* doStuffWithElement.pipe(Effect.provideService(MiniDom.Element, activeElement))
  yield* doStuffWithElement.pipe(Effect.provideService(MiniDom.Element, rootElement))
})
```

```ts
const doStuffWithElement = Effect.gen(function*(){
  const element = yield* MiniDom.Element
})
```

---

based on this .specs/domdb/research.md
let's create a a new package in this monorepo
following these instructions: .claude/commands/new-feature.md

packages-native/minidom folder
@effect-native/minidom package name
