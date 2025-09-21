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

```ts
Effect.gen(function*(){
  const document = yield* MiniDom.Document
  const root = yield* document.firstChild

  const textNode = yield* document.createTextNode("ahoy")

  const {nodeType, nodeName} = textNode // NOTE: no need for yield* for these fields since these are plain old javascript values

  yield* root.append(textNode)
})
```

---

based on this .specs/domdb/research.md
let's create a a new package in this monorepo
following these instructions: .claude/commands/new-feature.md

packages-native/minidom folder
@effect-native/minidom package name

---

> We need a few explicit calls before design starts:

- Core object model – I recommend “plain data + functions” (immutable records plus effectful helpers) to keep layering light. Alternative is mutable
classes that mimic DOM; easier for happy-dom interop but drifts toward browser semantics and complicates layering. Decide whether MiniDom nodes have
identity via refs or pure data snapshots.
- Attribute storage – Suggest a small dedicated AttributeBag implementation backed by ReadonlyMap + structural sharing so async/sync backends can reuse it.
Alternative is to defer to backend-specific bags (happy-dom’s own, window bag), which reduces reusability but lowers abstraction cost.
- Effect contract granularity – I lean toward returning Effect from every method that can touch backend state (e.g., document.firstChild, node.append). We
can keep invariants (like node.nodeType) as sync getters. Alternative is a mixed approach (only mutations are Effect), but then async sources break.
- MiniDom service shape – Recommend a single tagged service (MiniDom) with capability functions (factories, traversal helpers). Alternative is multiple
services (DocumentService, MutationService), giving finer DI at the cost of boilerplate.
- Layer packaging – Prefer exporting a ready Layer.Layer<MiniDom> factory for HappyMiniDom and a Layer.layer builder for WindowMiniDom. Alternative: expose
plain constructors and let consumers wrap them, but loses the “drop-in layer” ergonomics.
- Schema DSL boundary – I’d keep the DSL in a sibling module (@effect-native/minidom/schema) built directly on Effect Schema primitives. Alternative is
embedding DSL helpers in the core service, which tightens coupling but reduces imports.
- Error taxonomy – Suggest MiniDomError with sub-tags (e.g., ValidationError, MutationError) aligned with Effect TaggedError. Alternative is free-form
errors per module; faster now, harder to diagnose later.
- JSX strategy – I favor “loose runtime + optional codegen for .d.ts”. Alternative is strict-by-default JSX runtime that requires codegen upfront; delivers
types immediately but raises barrier to entry.
- Happy-dom dependency handling – Recommended: optional peer + dev dep, but provide guards in tests so they skip when missing. Alternative is to hard
require it for dev; easier locally, but violates optionality.
- Testing split – Plan for unit tests per implementation plus behavior-driven integration tests using the Effect contract (e.g., Effect.gen snippet you
provided). Alternative is to rely on happy-dom’s own test surface, but we need independent verification that our Effect wrappers behave.

