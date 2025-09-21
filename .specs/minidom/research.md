let's design a MiniDom ts interface that is a minimal subset of the standard XML/HTML/SGML DOM API. needs to be generic and not browser specific. could be used as the underlying set of classes that could be used to implement MATHML, VRML, HTML, XML, XHTML, SVG, etc. Needs to include everything necessary and nothing unnecessary. If there are two ways of doing things, pick the one way of doing it that is most flexible and modern. However, we also need to include extra stuff that may not already exist in the standard spec. define each set of functionality as separate interfaces that can be combined together. All non-standard stuff needs to be kept separate from the standard interfaces.

extra stuff we need: some idiomatic way to define custom elements along with the set of valid children / valid parents / required children

e.g. html document requires a single HTML child. an HTML element requires a HEAD and BODY in a specific order. META is only valid inside HEAD, etc... need to model all these requirements

need to be able to do something similar for attributes also

---

**Outcome | Obstacles | Plan**
You get a **generic MiniDom** TypeScript API + a **separate schema/validation layer** for parent/child/attribute rules.
Obstacle: specs differ (HTML, SVG, MathML), and constraints need order, categories, and conditionals.
Plan: keep **standard DOM‑ish** bits minimal; put **all extras** (schema, custom elements, validators) in a clean, composable **non‑standard** layer.

---

## POV | Goal | Obstacle | Tool

**POV:** framework author
**Goal:** one minimal DOM core reusable for HTML/XML/SVG/MathML/…
**Obstacle:** conflicting models and ad‑hoc rules (order, “transparent,” required attrs)
**Tool:** `MiniDom` (standard subset) + `MiniDomX` (non‑standard schema & validators)

---

## Design notes (blunt)

* **One way only:** modern `ParentNode`/`ChildNode` ops (`append`, `prepend`, `replaceChildren`, `before`, `after`, `replaceWith`, `remove`). No legacy `insertBefore`.
* **Namespaces first:** everything is **namespace‑aware**.
* **Attrs as a bag:** a tiny `AttributeBag` replaces legacy `getAttribute*` overload soup.
* **Strict separation:** `MiniDom` = subset of living DOM ideas; `MiniDomX` = schema DSL, custom elements, validators.
* **Schema DSL:** EBNF/Relax‑NG–style `ModelExpr` for **order**, **choice**, **multiplicity**, **interleave**, **transparent**, plus attribute constraints & dependencies.

---

## Code — **MiniDom** (standard‑subset) & **MiniDomX** (non‑standard extras)

```ts
// MiniDom: minimal, generic, non-browser DOM core
export type Namespace = string | null

export const enum NodeType {
  ELEMENT = 1,
  TEXT = 3,
  PROCESSING_INSTRUCTION = 7,
  COMMENT = 8,
  DOCUMENT = 9,
  DOCUMENT_TYPE = 10,
  DOCUMENT_FRAGMENT = 11
}

export interface Node {
  readonly nodeType: NodeType
  readonly nodeName: string
  readonly ownerDocument: Document | null
  parentNode: Element | Document | DocumentFragment | null
  previousSibling: Node | null
  nextSibling: Node | null
  textContent: string | null
  clone(deep?: boolean): Node
}

export interface ChildNode {
  before(...nodes: (Node | string)[]): void
  after(...nodes: (Node | string)[]): void
  replaceWith(...nodes: (Node | string)[]): void
  remove(): void
}

export interface ParentNode {
  readonly childNodes: Node[]
  readonly children: Element[]
  readonly firstChild: Node | null
  readonly lastChild: Node | null
  append(...nodes: (Node | string)[]): void
  prepend(...nodes: (Node | string)[]): void
  replaceChildren(...nodes: (Node | string)[]): void
}

export interface CharacterData extends Node, ChildNode {
  data: string
  readonly length: number
  substringData(offset: number, count: number): string
}

export interface Text extends CharacterData {
  readonly nodeType: NodeType.TEXT
  readonly nodeName: '#text'
}

export interface Comment extends CharacterData {
  readonly nodeType: NodeType.COMMENT
  readonly nodeName: '#comment'
}

export interface ProcessingInstruction extends CharacterData {
  readonly nodeType: NodeType.PROCESSING_INSTRUCTION
  readonly target: string
}

export interface DocumentType extends Node {
  readonly nodeType: NodeType.DOCUMENT_TYPE
  name: string
  publicId: string
  systemId: string
}

export interface AttributeBag {
  get(ns: Namespace, name: string): string | null
  set(ns: Namespace, name: string, value: string): void
  has(ns: Namespace, name: string): boolean
  delete(ns: Namespace, name: string): void
  entries(): Iterable<[ns: Namespace, name: string, value: string]>
}

export interface Element extends Node, ParentNode, ChildNode {
  readonly nodeType: NodeType.ELEMENT
  readonly namespaceURI: Namespace
  readonly localName: string
  readonly prefix: string | null
  readonly tagName: string // qualified name (with prefix if any)
  readonly attributes: AttributeBag
}

export interface DocumentFragment extends Node, ParentNode, ChildNode {
  readonly nodeType: NodeType.DOCUMENT_FRAGMENT
  readonly nodeName: '#document-fragment'
}

export interface Document extends Node, ParentNode {
  readonly nodeType: NodeType.DOCUMENT
  readonly contentType: string
  readonly URL: string
  readonly documentElement: Element | null
  createElementNS(ns: Namespace, qualifiedName: string): Element
  createTextNode(data: string): Text
  createComment(data: string): Comment
  createProcessingInstruction(target: string, data: string): ProcessingInstruction
  createDocumentFragment(): DocumentFragment
  createDocumentType(name: string, publicId?: string, systemId?: string): DocumentType
}
```

```ts
// MiniDomX: non-standard extension for schemas, custom elements, and validation

// --- Qualified names & helpers ---
export type ExpandedName = { ns: Namespace, name: string }
export const q = (ns: Namespace, name: string) => ({ ns, name } satisfies ExpandedName)
export const keyOf = (qn: ExpandedName) => `${qn.ns ?? ''}|${qn.name}`

// --- Node tests used by models ---
export type NodeTest =
  | { kind: 'element', name: ExpandedName }         // exact element
  | { kind: 'category', name: string }              // element belongs to category
  | { kind: 'any-element' }                         // wildcard element
  | { kind: 'text' }
  | { kind: 'comment' }
  | { kind: 'pi' }

// --- Content model (EBNF-ish with Relax NG bits) ---
export type ModelExpr =
  | { type: 'empty' }                                // no children allowed
  | { type: 'any' }                                  // any nodes
  | { type: 'transparent' }                          // inherit from nearest ancestor with non-transparent model
  | { type: 'one', of: NodeTest }                    // a single node matching test
  | { type: 'seq', of: ModelExpr[] }                 // ordered sequence
  | { type: 'choice', of: ModelExpr[] }              // one of
  | { type: 'zeroOrMore', of: ModelExpr }
  | { type: 'oneOrMore', of: ModelExpr }
  | { type: 'optional', of: ModelExpr }
  | { type: 'interleave', of: ModelExpr[] }          // order-free mix
  | { type: 'not', of: ModelExpr }                   // forbid

// --- Attribute constraints ---
export type AttrValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | { enum: readonly string[] }
  | { tokens: 'space' | 'comma' }                    // tokenized lists

export type AttrMatch =
  | { name: ExpandedName }                           // presence
  | { name: ExpandedName, equals: string }           // exact value
  | { name: ExpandedName, includesToken: string }    // token present

export interface AttributeConstraint {
  name: ExpandedName | { category: string }          // category supports "global" attrs
  type?: AttrValueType
  required?: boolean
  repeatable?: boolean                                // rare, for data-* like multi instances
  defaultValue?: string
}

export interface AttributeRelations {
  // If condition holds, require/forbid other attributes
  implies?: { when: AttrMatch, then: ExpandedName[] }[]
  forbids?: { when: AttrMatch, then: ExpandedName[] }[]
  // mutually exclusive groups: at most one present
  mutex?: ExpandedName[][]
}

export interface AttributeModel {
  allowed: 'any' | AttributeConstraint[]
  relations?: AttributeRelations
}

// --- Element rules (parents, children, categories, void/transparent) ---
export interface ElementRule {
  name: ExpandedName
  categories?: readonly string[]                     // membership, e.g., 'flow', 'metadata'
  content?: ModelExpr                                // permitted children
  parents?: ModelExpr                                // permitted parents (optional)
  requiredAncestors?: NodeTest[]                     // e.g., <li> requires an ancestor <ul>/<ol>
  void?: boolean                                     // no children node-wise (e.g., <meta>, <img>)
  transparent?: boolean                              // inherits ancestor model in matching
  attributes?: AttributeModel
}

// --- Schema: categories & element map (per namespace family) ---
export interface Schema {
  categories: Record<string, readonly ExpandedName[]>  // category -> element set
  elements: Record<string, ElementRule>                // keyOf(ExpandedName) -> rule
  globals?: {
    attributes?: AttributeModel                         // e.g., xml:lang, id, class (by category)
  }
}

// --- Registry for custom elements (by expanded name) ---
export interface CustomElementRegistry {
  define(rule: ElementRule): void
  get(name: ExpandedName): ElementRule | null
  schema(): Schema
}

// --- Validation API (declarative, pure) ---
export type DiagnosticLevel = 'error' | 'warning' | 'info'
export interface Diagnostic {
  level: DiagnosticLevel
  message: string
  node: Node
  path: readonly number[]                              // child indices from root, for stable refs
  code: string                                         // e.g., 'content.missing', 'attr.forbidden'
}

export interface Validator {
  // point checks
  isValidChild(parent: Element, child: Node): boolean
  isValidParent(child: Element, parent: Element | Document | DocumentFragment): boolean
  // discovery
  allowedChildrenOf(parent: Element): ExpandedName[]
  allowedParentsOf(child: Element): ExpandedName[]
  // whole-tree
  validateSubtree(root: Node): Diagnostic[]
}
```

### Tiny DSL helpers (ergonomic authoring)

```ts
// content model helpers
export const empty = (): ModelExpr => ({ type: 'empty' })
export const any = (): ModelExpr => ({ type: 'any' })
export const transparent = (): ModelExpr => ({ type: 'transparent' })
export const one = (t: NodeTest): ModelExpr => ({ type: 'one', of: t })
export const seq = (...xs: ModelExpr[]): ModelExpr => ({ type: 'seq', of: xs })
export const choice = (...xs: ModelExpr[]): ModelExpr => ({ type: 'choice', of: xs })
export const zeroOrMore = (x: ModelExpr): ModelExpr => ({ type: 'zeroOrMore', of: x })
export const oneOrMore = (x: ModelExpr): ModelExpr => ({ type: 'oneOrMore', of: x })
export const opt = (x: ModelExpr): ModelExpr => ({ type: 'optional', of: x })
export const interleave = (...xs: ModelExpr[]): ModelExpr => ({ type: 'interleave', of: xs })

// node tests
export const el = (ns: Namespace, name: string): NodeTest => ({ kind: 'element', name: q(ns, name) })
export const cat = (name: string): NodeTest => ({ kind: 'category', name })
export const anyEl = (): NodeTest => ({ kind: 'any-element' })
export const text = (): NodeTest => ({ kind: 'text' })
export const comment = (): NodeTest => ({ kind: 'comment' })
export const pi = (): NodeTest => ({ kind: 'pi' })
```

---

## Example schema snippet (HTML‑ish, just enough to show intent)

```ts
const HTML = 'http://www.w3.org/1999/xhtml' as const

// categories
const cats = {
  flow: [q(HTML, 'p'), q(HTML, 'div'), q(HTML, 'a'), q(HTML, 'section'), q(HTML, 'article'), q(HTML, 'ul'), q(HTML, 'ol'), q(HTML, 'table')],
  metadata: [q(HTML, 'meta'), q(HTML, 'title'), q(HTML, 'link'), q(HTML, 'style')]
} satisfies Record<string, ExpandedName[]>

// rules
const rules: ElementRule[] = [
  {
    name: q(HTML, 'html'),
    categories: [],
    // exactly one head then one body, in that order
    content: seq(one(el(HTML, 'head')), one(el(HTML, 'body')))
  },
  {
    name: q(HTML, 'head'),
    categories: [],
    // any number of metadata content, order-agnostic
    content: interleave(
      zeroOrMore(one(cat('metadata')))
    )
  },
  {
    name: q(HTML, 'meta'),
    categories: ['metadata'],
    void: true,
    attributes: {
      allowed: [
        { name: q(null, 'charset'), type: 'string' },
        { name: q(null, 'name'), type: 'string' },
        { name: q(null, 'http-equiv'), type: 'string' },
        { name: q(null, 'content'), type: 'string' }
      ],
      relations: {
        // if name/http-equiv present, content becomes required — illustration
        implies: [
          { when: { name: q(null, 'name') }, then: [q(null, 'content')] },
          { when: { name: q(null, 'http-equiv') }, then: [q(null, 'content')] }
        ]
      }
    },
    // only inside head
    parents: one(el(HTML, 'head'))
  },
  {
    name: q(HTML, 'body'),
    categories: ['flow'],  // “palpable” etc could be added
    // flow content in any order; text nodes allowed
    content: interleave(zeroOrMore(choice(one(cat('flow')), one(text()))))
  },
  {
    name: q(HTML, 'a'),
    categories: ['flow'],
    transparent: true,      // children must obey the parent’s allowed model
    attributes: { allowed: 'any' }
  }
]

export const htmlSchema: Schema = {
  categories: cats,
  elements: Object.fromEntries(rules.map(r => [keyOf(r.name), r])),
  globals: {
    attributes: {
      allowed: [
        { name: { category: 'global' }, type: 'string' }
      ]
    }
  }
}
```

---

## Example: **custom element** with constraints

```ts
const EX = 'https://example.com/ns' as const

// <x-tabs> requires one or more <x-tab> children; <x-tab> only valid inside <x-tabs>
const xTabs: ElementRule = {
  name: q(EX, 'x-tabs'),
  categories: ['flow'],
  content: oneOrMore(one(el(EX, 'x-tab'))),
  attributes: {
    allowed: [
      { name: q(null, 'activation'), type: { enum: ['auto', 'manual'] }, defaultValue: 'auto' }
    ]
  }
}

const xTab: ElementRule = {
  name: q(EX, 'x-tab'),
  categories: [],
  content: interleave(zeroOrMore(choice(one(text()), one(anyEl())))),
  parents: one(el(EX, 'x-tabs')),
  attributes: {
    allowed: [
      { name: q(null, 'id'), type: 'string', required: true },
      { name: q(null, 'disabled'), type: 'boolean' }
    ],
    relations: { mutex: [[q(null, 'disabled'), q(null, 'aria-disabled')]] }
  }
}
```

---

## What you can do with this (core APIs)

* **Build docs/elements** with `MiniDom` only—no schema involved.
* **Register rules** in a `CustomElementRegistry` (simple wrapper over `Schema`).
* **Discover & validate** using `Validator`:

  * `isValidChild(parent, child)` / `isValidParent(child, parent)`
  * `allowedChildrenOf(parent)` / `allowedParentsOf(child)`
  * `validateSubtree(root)` to get **diagnostics** with stable paths.

You can implement `Validator` by interpreting `ModelExpr` over a node’s children:

* `seq` ⇒ match ordered runs
* `choice` ⇒ try arms
* `zeroOrMore` / `oneOrMore` / `optional` ⇒ standard NFA style
* `interleave` ⇒ greedy bag matching (Relax NG style)
* `transparent` ⇒ climb ancestors to the nearest non‑transparent rule
* `void` ⇒ reject any child nodes
* Attributes: check `allowed`, enforce `required`, and apply `relations` (`implies`, `forbids`, `mutex`)

---

## Why this meets your constraints

* **Generic:** works for XML, XHTML, SVG, MathML, VRML (with your own rules).
* **Minimal:** only nodes, attributes, and modern tree ops; no events, layout, or browser APIs.
* **One way:** modern ops + namespace‑aware attr bag.
* **Extensible:** *all* policy is in `MiniDomX` (non‑standard).
* **Deterministic:** ordered vs interleaved children, categories, required ancestors, and attribute dependencies are all expressible.

---

### Copy‑worthy summary

```
MiniDom = tiny, namespaced DOM core with modern tree ops.
MiniDomX = declarative schema DSL (content & attr models), custom element registry, and validator API.
Standard vs non-standard are cleanly separated; policy lives in MiniDomX.
```

---

😎 **One check**: do you want **CDATA** as a separate node type (XML‑only), or is treating it as `Text` acceptable? **Yes/No**

---

update MiniDomX such that invalid states are unrepresentable

---

**Outcome | Obstacles | Plan**
A **MiniDomX** that makes invalid trees **unrepresentable at compile‑time**.
Obstacle: TypeScript isn’t dependently typed; “transparent” models and conditional attributes are tricky.
Plan: a **typed schema DSL** + **typed tree builders** that encode content/attribute rules in types; runtime DOM is only produced from a type‑safe tree.

---

## Strategy (blunt)

* **Standard vs extra** stays split: `MiniDom` (core DOM) unchanged. `MiniDomX` (non‑standard) gains a **type‑level schema** and **type‑safe builders**.
* **Unrepresentable invalid states:** You don’t “append”; you **construct a tree literal** whose **type** is the proof it’s valid. Only then you materialize it into `MiniDom`.
* **Content models:** Sequences and “many” (0+ / 1+) are enforced with tuple/array types (`[]`, `[A,B]`, `T[]`, `[T, ...T[]]`).
* **Categories:** `cat('flow')` maps to a **union of element names**; parents accept categories, not ad‑hoc element lists.
* **Attributes:** Use **closed cases** (`cases: [...]`) to express conditional requirements (e.g., `<meta>`: `charset` **or** `name+content` **or** `http-equiv+content`). This makes illegal combos untypable.
* **Transparent content:** Provided as an opt‑in helper (inherits parent model) — compile‑time enforced when used.

---

## MiniDomX — invalid states unrepresentable

```ts
// MiniDomX (non-standard). All types are independent of browsers.

// ---------- Names & helpers ----------
export type Namespace = string | null
export type QName = `${Namespace}|${string}`

export const q = (ns: Namespace, name: string) => `${ns}|${name}` as const

type NonEmptyArray<T> = [T, ...T[]]
type Strict<T extends Record<string, unknown>> =
  T & { [K in Exclude<string, keyof T>]?: never }  // no extra keys in object literals

// ---------- Schema core ----------
export type AttrScalar = string | number | boolean

export type AttrCase = Record<string, AttrScalar>

export type AttrModel =
  | { kind: 'any' }                                   // open bag (least safe)
  | { kind: 'cases', cases: readonly AttrCase[] }     // closed, conditional combos (most safe)

export type NodeTest<S> =
  | { el: Name<S> }                                   // exact element
  | { cat: Cat<S> }                                   // category membership
  | { text: true }                                    // text node

export type One<S, T extends NodeTest<S>> = { kind: 'one', of: T }
export type Many<S, T extends NodeTest<S>, Min extends 0 | 1 = 0> =
  { kind: 'many', of: T, min?: Min }
export type Seq<S, Parts extends readonly ModelNode<S>[]> =
  { kind: 'seq', of: Parts }
export type Empty = { kind: 'empty' }
export type Transparent = { kind: 'transparent' }     // special; needs parent context

export type ModelNode<S> =
  | One<S, NodeTest<S>>
  | Many<S, NodeTest<S>, 0 | 1>
  | Seq<S, readonly ModelNode<S>[]>
  | Empty
  | Transparent

export interface ElementRule<S> {
  // bookkeeping
  cats?: readonly Cat<S>[]
  void?: boolean                   // if true, content must be Empty
  transparent?: boolean            // if true, children must obey the nearest non-transparent ancestor

  // content & attributes
  content: ModelNode<S>
  attributes: AttrModel
}

export interface Schema<
  E extends Record<QName, ElementRule<any>>,
  C extends Record<string, readonly (keyof E & string)[]>,
  Roots extends readonly (keyof E & string)[]
> {
  elements: E
  categories: C
  roots: Roots
}

// Convenience type accessors
export type Name<S> = keyof S extends never ? never : keyof S['elements'] & string
export type Cat<S> = keyof S['categories'] & string
export type InCat<S, K extends Cat<S>> = S['categories'][K][number]

// ---------- Typed tree (the only way to build) ----------
export interface TextNode {
  kind: 'text'
  data: string
}

export type AttrsFor<S, N extends Name<S>> =
  S['elements'][N]['attributes'] extends { kind: 'any' }
    ? Strict<Record<string, AttrScalar>>
    : S['elements'][N]['attributes'] extends { kind: 'cases', cases: infer CS extends readonly AttrCase[] }
      ? { [I in keyof CS]: Strict<CS[I] & {}> }[number]
      : never

export type El<S, N extends Name<S>> = Strict<{
  kind: 'element'
  name: N
  attrs: AttrsFor<S, N>
  children: ChildrenFor<S, N>
}>

type ChildFromTest<S, T extends NodeTest<S>> =
  T extends { el: infer K extends Name<S> } ? El<S, K> :
  T extends { cat: infer K extends Cat<S> } ? El<S, InCat<S, K>> :
  T extends { text: true } ? TextNode :
  never

type ConcatChildren<S, Parts extends readonly ModelNode<S>[]> =
  Parts extends readonly [infer H extends ModelNode<S>, ...infer R extends readonly ModelNode<S>[]]
    ? [...ChildrenForNode<S, H>, ...ConcatChildren<S, R>]
    : []

type ChildrenForNode<S, M extends ModelNode<S>> =
  M extends Empty ? [] :
  M extends Transparent ? never :                               // handled via helper (see below)
  M extends One<S, infer T extends NodeTest<S>> ? [ChildFromTest<S, T>] :
  M extends Many<S, infer T extends NodeTest<S>, infer Min extends 0 | 1>
    ? Min extends 1 ? NonEmptyArray<ChildFromTest<S, T>> : ChildFromTest<S, T>[] :
  M extends Seq<S, infer Parts extends readonly ModelNode<S>[]> ? ConcatChildren<S, Parts> :
  never

export type ChildrenFor<S, N extends Name<S>> =
  ChildrenForNode<S, S['elements'][N]['content']> extends infer X
    // If void, children must be [] (unrepresentable otherwise)
    ? S['elements'][N]['void'] extends true ? [] : X
    : never

// ---------- Typed document wrapper ----------
export type DocTree<S, R extends Name<S>> = Strict<{
  kind: 'document'
  root: El<S, R>
}>

// ---------- Builder API bound to a schema ----------
export const typed = <
  E extends Record<QName, ElementRule<any>>,
  C extends Record<string, readonly (keyof E & string)[]>,
  Roots extends readonly (keyof E & string)[]
>(schema: Schema<E, C, Roots>) => {
  type S = typeof schema
  type Root = S['roots'][number]

  const text = (data: string): TextNode => ({ kind: 'text', data })

  const el = <N extends Name<S>>(
    name: N,
    attrs: AttrsFor<S, N>,
    children: ChildrenFor<S, N>
  ): El<S, N> => ({ kind: 'element', name, attrs, children })

  // Transparent helper: children must match the parent’s model
  const transparent = <N extends Name<S>, P extends Name<S>>(
    name: N,
    parent: P,
    attrs: AttrsFor<S, N>,
    // reinterpret children under parent's content model
    children: ChildrenFor<S, P>
  ): El<S, N> => ({ kind: 'element', name, attrs, children } as El<S, N>)

  const doc = (root: El<S, Root>): DocTree<S, Root> => ({ kind: 'document', root })

  return { schema, text, el, transparent, doc }
}

// ---------- (Optional) materializer into MiniDom ----------
export const materialize = (doc: DocTree<any, any>, minidom: {
  createDocument: () => {
    createElementNS: (ns: Namespace, local: string) => unknown
    createTextNode: (t: string) => unknown
    append: (...nodes: unknown[]) => void
    // ...wire to your MiniDom Document/Element APIs
  }
}) => {
  const D = minidom.createDocument()
  const build = (n: TextNode | El<any, any>): any => {
    if (n.kind === 'text') return D.createTextNode(n.data)
    const [ns, local] = (n.name as string).split('|') as [Namespace, string]
    const e: any = D.createElementNS(ns === 'null' ? null : ns, local)
    for (const [k, v] of Object.entries(n.attrs)) (e as any).attributes?.set(null, k, String(v))
    for (const c of n.children) (e as any).append(build(c as any))
    return e
  }
  const root = build(doc.root)
  ;(D as any).append(root)
  return D
}
```

### Why this makes invalid states unrepresentable

* **Children:** `ChildrenFor<S,N>` is derived from the **declared content model**. If `<html>` says `Seq<[head, body]>`, the only type that fits is `[El<head>, El<body>]`. Wrong order or wrong kinds → **type error**.
* **Void:** `void: true` forces `children` to `[]`.
* **Categories:** `cat('metadata')` expands to a union of element names. Placing a non‑metadata element where metadata is required → **type error**.
* **Attributes:** `attributes: { kind: 'cases', cases: [...] }` yields a **union of object shapes**; illegal combos are not constructible.
* **Transparent:** `transparent(name, parent, attrs, childrenOfParent)` ties an element’s children to its parent’s allowed children, making “transparent” compile‑time safe **when you opt in**.

---

## Example schema (HTML slice) + examples

```ts
// HTML slice
const HTML = 'http://www.w3.org/1999/xhtml' as const
const H = (local: string) => q(HTML, local)

type S = Schema<
  {
    [K in `${typeof HTML}|html`]: ElementRule<unknown>
  } & {
    [k: string]: ElementRule<unknown>
  },
  Record<string, readonly QName[]>,
  readonly QName[]
>

// Define a tiny, composable schema
export const htmlSchema = {
  elements: {
    [H('html')]: {
      content: { kind: 'seq', of: [
        { kind: 'one', of: { el: H('head') } },
        { kind: 'one', of: { el: H('body') } }
      ]},
      attributes: { kind: 'cases', cases: [ {} ] }
    },
    [H('head')]: {
      // zero or more metadata items (title, meta, link, style)
      content: { kind: 'many', of: { cat: 'metadata' }, min: 0 },
      attributes: { kind: 'cases', cases: [ {} ] }
    },
    [H('title')]: {
      content: { kind: 'many', of: { text: true }, min: 1 }, // must contain text
      attributes: { kind: 'cases', cases: [ {} ] }
    },
    [H('meta')]: {
      void: true,
      content: { kind: 'empty' },
      attributes: { kind: 'cases', cases: [
        { charset: 'utf-8' as string },
        { name: '' as string, content: '' as string },
        { 'http-equiv': '' as string, content: '' as string }
      ] }
    },
    [H('body')]: {
      // flow content or text in any amount
      content: { kind: 'many', of: { cat: 'flow' }, min: 0 },
      attributes: { kind: 'cases', cases: [ {} ] }
    },
    [H('p')]: {
      cats: ['flow'],
      content: { kind: 'many', of: { text: true }, min: 1 },
      attributes: { kind: 'cases', cases: [ {} ] }
    },
    [H('a')]: {
      cats: ['flow'],
      // marked transparent; use helper when building
      transparent: true,
      content: { kind: 'transparent' },
      attributes: { kind: 'cases', cases: [ { href: '' as string } ] }
    }
  },
  categories: {
    metadata: [H('meta'), H('title')],
    flow: [H('p'), H('a')]
  },
  roots: [H('html')]
} satisfies Schema<
  any, any, any
>

// Bind builders to schema
const T = typed(htmlSchema)

// ✅ valid: <html><head><meta charset/ ><title>…</title></head><body><p>Hi</p></body></html>
export const good = T.doc(
  T.el(H('html'), {},
    [
      T.el(H('head'), {}, [
        T.el(H('meta'), { charset: 'utf-8' }, []),
        T.el(H('title'), {}, [T.text('MiniDomX')])
      ]),
      T.el(H('body'), {}, [
        T.el(H('p'), {}, [T.text('Hi')])
      ])
    ]
  )
)

// 🚫 invalid examples (compile-time):
// @ts-expect-error html requires [head, body] in order
T.doc(T.el(H('html'), {}, [T.el(H('body'), {}, []), T.el(H('head'), {}, [])]))

// @ts-expect-error meta only allowed in head (not in flow)
T.doc(T.el(H('html'), {}, [
  T.el(H('head'), {}, []),
  T.el(H('body'), {}, [T.el(H('meta'), { charset: 'utf-8' }, [])])
]))

// @ts-expect-error title must have text
T.doc(T.el(H('html'), {}, [
  T.el(H('head'), {}, [T.el(H('title'), {}, [])]),
  T.el(H('body'), {}, [])
]))

// Transparent example: <a> inherits parent’s model
export const withAnchor = T.doc(
  T.el(H('html'), {}, [
    T.el(H('head'), {}, []),
    T.el(H('body'), {}, [
      T.transparent(H('a'), H('body'), { href: '#' },
        [T.el(H('p'), {}, [T.text('inside a')])]
      )
    ])
  ])
)
```

> The only way to create a runtime document is by **materializing** a `DocTree`. Arbitrary `append`/`insert` are out of the type path, so invalid structures cannot be constructed through this API.

---

## Custom elements (same guarantees)

```ts
const EX = 'https://example.com/ns' as const
const X = (n: string) => q(EX, n)

export const tabsSchema = {
  elements: {
    [X('x-tabs')]: {
      cats: ['flow'],
      content: { kind: 'many', of: { el: X('x-tab') }, min: 1 },
      attributes: { kind: 'cases', cases: [ { activation: 'auto' as string }, { activation: 'manual' as string }, {} ] }
    },
    [X('x-tab')]: {
      content: { kind: 'many', of: { text: true }, min: 1 },
      attributes: { kind: 'cases', cases: [ { id: '' as string }, { id: '' as string, disabled: true as boolean } ] }
    }
  },
  categories: { flow: [X('x-tabs')] },
  roots: [X('x-tabs')]
} satisfies Schema<any, any, any>

const XTyped = typed(tabsSchema)

// ✅ must have at least one <x-tab>
XTyped.doc(
  XTyped.el(X('x-tabs'), { activation: 'auto' }, [
    XTyped.el(X('x-tab'), { id: 't1' }, [XTyped.text('One')])
  ])
)

// @ts-expect-error no tabs provided
XTyped.doc(XTyped.el(X('x-tabs'), {}, []))
```

---

## Notes & tradeoffs

* **Transparent content** needs context; the `transparent(...)` helper provides that context so types can prove correctness. If you avoid `transparent`, you still get strong guarantees for most element models.
* **Attributes:** `cases` is the **most precise** way to encode requirements (e.g., implied `content` when `name` is present). If you prefer a looser spec (`kind: 'any'`), you trade compile‑time safety for flexibility.
* **Schema invariants:** Keep `void: true` in sync with `content: { kind: 'empty' }`. You can add a `defineSchema(...)` wrapper that rejects mismatches at compile time using conditional‑type tricks; omitted here to keep the core minimal.

---

### Copy‑worthy summary

```
MiniDomX encodes element/attribute rules in types.
You build a typed tree, not a mutable DOM.
Only a well-typed tree can be materialized.
Result: invalid structures (wrong child, wrong order, missing required attrs) are unrepresentable.
```

😎 Want me to add a `defineSchema(...)` helper that *statically* rejects `void`+non‑empty or unknown category members?

---

how can we align all this with Standard Schema (https://standardschema.dev/) and JSX / ReactElement / ReactNode and Effect Schema effect@^3.17 react@^19.1 and Web Components

target audience is the Effect-TS ecosystem
so it would be nice to reuse Effect Schema functionality
avoid reimplementing anything already available in effect@^3.17

zero dependencies other than effect@^3.17
no actual dependency on react, but keep types in alignment
avoid deviation from ReactElement and ReactNode types

---

**Outcome | Obstacles | Plan**
Aligned **MiniDomX** with **Standard Schema**, **Effect Schema (effect@^3.17)**, **JSX/ReactElement/ReactNode**, and **Web Components**.
Obstacle: JSX types aren’t generic, React types can’t be imported, and we want compile‑time content rules without re‑implementing validators.
Plan: **Effect Schema as the single source of truth** → derive **Standard Schema V1**, strict **typed builders** for “invalid‑states‑unrepresentable”, optional **JSX runtime** that stays structurally compatible with React 19 elements, and a **typed Custom Elements bridge**. ([Effect][1])

---

## Blunt summary

* **One source of truth** = `Schema` from `effect`. No extra libs.
* **Standard Schema** = call `Schema.standardSchemaV1(schema)` to export interop. ([Effect][1])
* **React alignment** = our VNodes are **structurally** ReactElements/Nodes (no dependency).
* **Strict mode** = typed builders (compile‑time guarantees). **JSX mode** = structural compatibility + runtime validation via Effect.
* **Web Components** = typed attributes & child constraints enforced with Effect; registered with `customElements`. ([MDN Web Docs][2])

---

## 1) Core: schema‑first element rules (Effect only)

> Everything below compiles with **only** `effect@^3.17`.

```ts
// style: 2 spaces, no semicolons
import { Schema as S, Effect } from 'effect'

// ---------- Names ----------
export type Namespace = string | null
export type QName = `${Namespace}|${string}`
export const q = (ns: Namespace, local: string) => `${ns}|${local}` as const

// ---------- Element rule (schema-first) ----------
// A = attributes type, C = children "shape" type (you decide the shape)
// We DO NOT reimplement a validator; we USE Effect Schema as the validator.
export interface ElementRule<A, C> {
  name: QName
  categories?: readonly string[]
  void?: boolean                 // if true, children schema must be empty
  transparent?: boolean          // "inherits" parent model (enforced by builders)
  attrs: S.Schema<A>             // Effect schema for attributes
  children: S.Schema<C>          // Effect schema for immediate children "shape"
  parents?: S.Schema<unknown>    // optional: allowed parent "shape" (rarely needed)
}

// Map of all elements for a namespace family
export interface Registry {
  elements: Record<QName, ElementRule<any, any>>
  categories: Record<string, readonly QName[]>
  roots: readonly QName[]
}

// Helper to define a registry with type inference (no new runtime)
export const defineRegistry = <R extends Registry>(r: R) => r

// ---------- Types derived from Effect Schema ----------
export type AttrsOf<R extends Registry, N extends keyof R['elements'] & string> =
  S.Schema.Type<R['elements'][N]['attrs']>

export type ChildrenOf<R extends Registry, N extends keyof R['elements'] & string> =
  R['elements'][N]['void'] extends true ? [] : S.Schema.Type<R['elements'][N]['children']>
```

**Why this helps**

* **No custom validator**: we reuse Effect’s `Schema.decode*/encode*` wherever we need runtime checking.
* **Standard Schema interop**: for any schema that has `R = never`, `Schema.standardSchemaV1` yields a Standard Schema **without** new deps. ([Effect][1])

---

## 2) “Invalid states unrepresentable” builders (strict, no JSX)

> Build trees that are valid **by type**, then materialize.

```ts
// A minimal VNode structurally compatible with ReactElement
export type Key = string | number | null
export type ElementType<P = unknown> =
  | string                                            // intrinsic (qname string)
  | ((props: P) => VElement<any>)                     // function component-like

export interface VElement<P = unknown, T extends ElementType<P> = ElementType<P>> {
  // keep React-compatible fields
  readonly $$typeof?: symbol
  readonly type: T
  readonly key: Key
  readonly ref?: unknown
  readonly props: Readonly<P>
}

export type VNode =
  | VElement<any>
  | string | number | boolean | null | undefined
  | Iterable<VNode>                                   // ReactFragment-compatible

// A component props type for intrinsic elements from the registry
export type IntrinsicProps<R extends Registry, N extends keyof R['elements'] & string> =
  Readonly<AttrsOf<R, N> & { children: ChildrenOf<R, N> }>

// Typed builders bound to a registry (STRICT MODE, no JSX)
export const bindStrict = <R extends Registry>(reg: R) => {
  type N = keyof R['elements'] & string

  const el = <Name extends N>(
    name: Name,
    attrs: AttrsOf<R, Name>,
    children: ChildrenOf<R, Name>
  ): VElement<IntrinsicProps<R, Name>, Name> => ({
    type: name,
    key: null,
    props: { ...attrs, children } as IntrinsicProps<R, Name>
  })

  // "Transparent" helper: reuse parent's children type as the child’s children
  const transparent = <
    Name extends N,
    Parent extends N
  >(
    name: Name,
    parent: Parent,
    attrs: AttrsOf<R, Name>,
    // IMPORTANT: children typed by PARENT'S allowed children
    children: ChildrenOf<R, Parent>
  ): VElement<IntrinsicProps<R, Name>, Name> => ({
    type: name,
    key: null,
    props: { ...attrs, children } as IntrinsicProps<R, Name>
  })

  return { el, transparent, registry: reg }
}
```

**Result**

* Wrong child type, wrong order, missing required child, or children for a `void` element → **type error**.
* This is independent from JSX; use it for authoring libraries, codegen, or server transforms.

---

## 3) JSX alignment (no React dependency)

**Goal:** provide a JSX runtime that is **structurally** React‑compatible so your code can later be mapped to real React elements—without importing React. React 19’s element/fragment/children shapes remain compatible. ([React][3])

```ts
// A light JSX runtime with structural React compatibility
// Use with:  "jsx": "react-jsx", "jsxImportSource": "minidomx"
export const Fragment: unique symbol = Symbol.for('minidomx.fragment')

type PropsOf<R extends Registry, T> =
  T extends string ? IntrinsicProps<R, Extract<T, string>> :
  T extends (props: infer P) => any ? Readonly<P> :
  never

export const createJsxRuntime = <R extends Registry>(reg: R) => {
  const jsx = <T,>(
    type: T,
    props: PropsOf<R, T>,
    key?: Key
  ): VElement<PropsOf<R, T>, T> => ({
    type,
    key: key ?? null,
    props
  })

  const jsxs = jsx
  return { jsx, jsxs, Fragment }
}
```

> **Strictness:** JSX cannot express schema‑dependent `JSX.IntrinsicElements` globally without a `.d.ts` step. Two options:
>
> * **Strict JSX**: generate a tiny `.d.ts` from `Registry` that writes `declare global { namespace JSX { interface IntrinsicElements { … }}}` so every tag has **exact** props (`AttrsOf & ChildrenOf`).
> * **Loose JSX**: keep generic props in `createJsxRuntime` and call **Effect decoders at runtime** (see §5).

Both keep the **ReactElement**/**ReactNode** structure, so interop adapters are trivial later.

---

## 4) Standard Schema interop (zero extra deps)

**Effect ⇒ Standard Schema V1**: turn any attribute/children schema into a Standard Schema object we can hand to ecosystem tools.

```ts
export const toStandard = <A>(schema: S.Schema<A>) =>
  S.standardSchemaV1(schema)   // returns a StandardSchemaV1-compatible object
// No import from @standard-schema/spec necessary
```

* Use for **attributes** schemas, **children** schemas, or a **serializable AST** schema if you expose your tree as data.
* Caveat: only schemas with `R = never` are convertible. ([Effect][1])

**What Standard Schema is**: a common interface (`~standard.validate`) so tools accept validators from any library (Zod, Valibot, ArkType, Effect, …). Effect implements this path. ([GitHub][4])

---

## 5) Runtime helpers (Effect only)

**Validate props & children (JSX‑loose mode):**

```ts
export const decodeAttrs = <A>(schema: S.Schema<A>) =>
  S.decodeUnknown(schema)

export const decodeChildren = <C>(schema: S.Schema<C>) =>
  S.decodeUnknown(schema)
```

In JSX‑loose mode (no d.ts generation), call `decodeAttrs(rule.attrs)(props)` and `decodeChildren(rule.children)(children)` where you construct elements. This keeps **zero deps** and avoids re‑implementing validators.

---

## 6) Web Components bridge (typed Custom Elements)

> Turn your `ElementRule` into a **Custom Element** with typed attributes & child checks (no libraries required). ([MDN Web Docs][2])

```ts
type AttrNamesOf<A> = Extract<keyof A, string>[]

export const defineCustomElement = <A, C>(
  tag: string,
  rule: ElementRule<A, C>,
  options?: {
    observed?: readonly (keyof A & string)[]    // else we infer from schema where possible
    shadow?: { mode?: 'open' | 'closed' } | false
    onMount?: (ctx: {
      host: HTMLElement
      attrs: A
      children: C
      decodeAttr: (name: string, value: unknown) => Effect.Effect<A, unknown>
    }) => void
  }
) => {
  const observed = options?.observed ?? [] as string[]

  class X extends HTMLElement {
    static get observedAttributes() { return observed }

    #attrs: A | null = null

    constructor() {
      super()
      if (options?.shadow) this.attachShadow({ mode: options.shadow.mode ?? 'open' })
    }

    connectedCallback() {
      const attrsObj = Object.fromEntries(observed.map(n => [n, this.getAttribute(n)]))
      const decode = S.decodeUnknown(rule.attrs)
      const attrs = Effect.runSync(decode(attrsObj))
      this.#attrs = attrs

      // children decoding is app-specific; for HTML you might parse DOM → C with your own adapter
      const children = null as unknown as C

      options?.onMount?.({
        host: this,
        attrs,
        children,
        decodeAttr: (name, value) => decode({ ...(attrs as any), [name]: value })
      })
    }

    attributeChangedCallback(name: string, _old: string | null, next: string | null) {
      if (this.#attrs == null) return
      const decode = S.decodeUnknown(rule.attrs)
      const updated = Effect.runSync(decode({ ...(this.#attrs as any), [name]: next }))
      this.#attrs = updated
    }
  }

  customElements.define(tag, X)
  return X
}
```

You can add **content checks** by mapping DOM children to the `children` schema (e.g., build a small adapter that converts live DOM → your children shape, then `S.decodeUnknown`).

---

## 7) Putting it together — tiny HTML slice (strict + JSX)

```ts
// Registry (HTML slice)
const HTML = 'http://www.w3.org/1999/xhtml' as const
const H = (local: string) => q(HTML, local)

export const htmlReg = defineRegistry({
  elements: {
    [H('html')]: {
      name: H('html'),
      attrs: S.Struct({}),
      // exactly [head, body]
      children: S.Tuple(
        S.Struct({ kind: S.Literal(H('head')) }),
        S.Struct({ kind: S.Literal(H('body')) })
      ),
      void: false
    },
    [H('head')]: {
      name: H('head'),
      attrs: S.Struct({}),
      // zero or more of metadata
      children: S.Array(
        S.Union(
          S.Struct({ kind: S.Literal(H('title')) }),
          S.Struct({ kind: S.Literal(H('meta')) })
        )
      )
    },
    [H('title')]: {
      name: H('title'),
      attrs: S.Struct({}),
      children: S.NonEmptyArray(S.String)           // e.g., simple "text sequence"
    },
    [H('meta')]: {
      name: H('meta'),
      void: true,
      attrs: S.Union(
        S.Struct({ charset: S.String }),
        S.Struct({ name: S.String, content: S.String }),
        S.Struct({ 'http-equiv': S.String, content: S.String })
      ),
      children: S.Tuple()                            // empty
    },
    [H('body')]: {
      name: H('body'),
      attrs: S.Struct({}),
      children: S.Array(
        S.Union(
          S.Struct({ kind: S.Literal(H('p')) }),
          S.Struct({ kind: S.Literal(H('a')) }),
          S.String                                       // allow plain text nodes via string
        )
      )
    },
    [H('a')]: {
      name: H('a'),
      transparent: true,
      attrs: S.Struct({ href: S.String }),
      children: S.Array(S.Unknown)                   // enforced via transparent builder
    },
    [H('p')]: {
      name: H('p'),
      attrs: S.Struct({}),
      children: S.NonEmptyArray(S.String)
    }
  },
  categories: {
    metadata: [H('title'), H('meta')]
  },
  roots: [H('html')]
})

// Strict builder (invalid states are untypable)
const Strict = bindStrict(htmlReg)

export const goodStrict =
  Strict.el(H('html'), {}, [
    { kind: H('head') } as const,
    { kind: H('body') } as const
  ])

// JSX runtime (loose or strict with generated d.ts)
export const MiniJSX = createJsxRuntime(htmlReg)

// example usage (loose): const el = <html><head /><body /></html>
// then validate props/children with Effect if you need runtime assurance:
const stdSchema = toStandard(htmlReg.elements[H('meta')].attrs) // hand to any tool
```

> The exact shapes of `children` are up to you. The point is: **schemas live in Effect**, we reuse them everywhere (runtime decoding, Standard Schema export, and—if desired—generate a `.d.ts` to make JSX strict).

---

## 8) React / Preact / Solid adapters (optional, no deps)

Because our `VElement` is a structural **ReactElement** clone, adapters are tiny:

```ts
// call-site supplies a factory (e.g., React.createElement)
export const toFactory =
  (factory: (type: any, props: any, key: any) => any) =>
  (node: VNode): any => {
    if (node == null || typeof node !== 'object' || !('type' in (node as any))) return node
    const el = node as VElement<any>
    return factory(el.type, el.props, el.key)
  }
```

Consumers can pass `React.createElement` when they actually use React; your library itself stays React‑free.

---

## 9) Why this aligns with everything (quick map)

* **Standard Schema**: produced directly from Effect via `Schema.standardSchemaV1`. No extra package. ([Effect][1])
* **Effect‑TS**: all validation/derivations reuse Effect’s **official** Schema APIs—no reinvention. ([Effect][5])
* **JSX/React types**: element/node shapes match React 19 (element has `{ type, key, props, ref? }`, fragments are iterables). No React import. ([React][3])
* **Web Components**: platform‑native `customElements.define` wrapper with typed attributes parsed by Effect. ([MDN Web Docs][2])

---

## 10) Minimal migration checklist

* Define a **Registry** with per‑element `attrs` / `children` **Effect** schemas.
* Use **strict builders** in libraries; allow **JSX** in apps, backed by **decodeUnknown** at boundaries.
* Export **Standard Schema** from any element/attribute schema that must interop.
* Add optional codegen to emit `JSX.IntrinsicElements` `.d.ts` from the registry if you want **strict JSX**.

---

### Copy‑worthy

```
Policy lives in Effect Schema.
- Build strict trees with typed builders (no JSX required).
- If you want JSX, keep structural React compatibility and validate at runtime with Effect.
- Export Standard Schema V1 from the same Effect schemas for ecosystem interop.
- Web Components: define() parses and enforces attributes/children with Effect.
Zero deps beyond effect@^3.17.
```

---

😎 **Yes/No**: OK to generate a small `.d.ts` from the registry to make `JSX.IntrinsicElements` strict (otherwise we keep JSX in “loose + runtime validated” mode)?

[1]: https://effect.website/docs/schema/standard-schema/?utm_source=chatgpt.com "Schema to Standard Schema"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements?utm_source=chatgpt.com "Using custom elements - Web APIs | MDN - Mozilla"
[3]: https://react.dev/blog/2024/12/05/react-19?utm_source=chatgpt.com "React v19"
[4]: https://github.com/standard-schema/standard-schema?utm_source=chatgpt.com "A standard interface for TypeScript schema validation ..."
[5]: https://effect.website/docs/schema/introduction/?utm_source=chatgpt.com "Introduction to Effect Schema | Effect Documentation"
