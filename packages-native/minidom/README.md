# @effect-native/minidom

Typed, capability-driven MiniDom abstractions for Effect Native runtimes.

## Status

This package is under active development and not yet published.

## Installation

```bash
pnpm add @effect-native/minidom effect @effect/schema
# optional adapter for server-side usage
pnpm add -D happy-dom
```

## Quick Start — HappyMiniDom

```ts
import * as Effect from "effect/Effect"
import * as MiniDom from "@effect-native/minidom"
import * as HappyMiniDom from "@effect-native/minidom/HappyMiniDom"

const bootstrap = Effect.provide(
  Effect.gen(function*() {
    const service = yield* MiniDom.MiniDom
    const { document } = service

    const main = yield* document.createElementNS("http://www.w3.org/1999/xhtml", "main")
    const text = yield* document.createTextNode("hello MiniDom")

    yield* main.append(text)
    yield* document.documentElement!.append(main)

    return {
      url: document.URL,
      sync: MiniDom.Sync.is(service.capabilities.sync),
      markup: document.documentElement!.outerHTML
    }
  }),
  HappyMiniDom.layer()
)

const result = await Effect.runPromise(bootstrap)
console.log(result.url, result.sync)
```

The HappyMiniDom adapter spins up a `happy-dom` window by default and exposes the
standard MiniDom `layer`/`make` helpers together with capability descriptors.

## Adapter Layers

### WindowMiniDom (browser wiring)

```ts
import * as Effect from "effect/Effect"
import * as MiniDom from "@effect-native/minidom"
import * as WindowMiniDom from "@effect-native/minidom/WindowMiniDom"

const program = Effect.provide(
  Effect.gen(function*() {
    const service = yield* MiniDom.MiniDom

    return {
      sameWindow: service.window === window,
      hasSync: MiniDom.Sync.is(service.capabilities.sync)
    }
  }),
  WindowMiniDom.layer({ window })
)

await Effect.runPromise(program)
```

Adapters expose capability metadata so downstream tools can branch on available
features. For example, you can eagerly detect synchronous execution with
`MiniDom.Sync.detect` or gate transactional helpers on
`service.capabilities.transaction`.

## Observing Updates with MiniDom.Events

```ts
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as MiniDom from "@effect-native/minidom"

const events = Effect.provide(
  Effect.gen(function*() {
    const counter = yield* Ref.make(0)
    const mailbox = yield* MiniDom.Events.query(["article:list"])(Ref.get(counter))

    yield* MiniDom.Events.mutation(["article:list"])(Ref.update(counter, (n) => n + 1))
    yield* MiniDom.Events.invalidate(["article:list"])

    return yield* mailbox.take
  }),
  Layer.mergeAll(Layer.scope, MiniDom.Events.layer)
)

const latest = await Effect.runPromise(events)
```

`MiniDom.Events.layer` wraps the shared Effect Reactivity service, so queries,
mutations, and invalidations flow through a consistent observation channel
without custom polling logic.

## Registry Samples & Validation

MiniDom ships canned registries that demonstrate how adapter metadata maps into
standard schema validation. The SQL sample pairs an `article` element with
`section` children and embeds column hints:

```ts
import * as Schema from "@effect-native/minidom/Schema"

const registry = Schema.samples.sqlArticleRegistry

const standard = Schema.toStandardSchemaV1(registry)
const result = await standard["~standard"].validate({
  name: Schema.q("http://www.w3.org/1999/xhtml", "article"),
  attributes: [{ name: Schema.q(null, "data-slug"), value: "intro" }],
  children: [
    {
      name: Schema.q("http://www.w3.org/1999/xhtml", "section"),
      attributes: [{ name: Schema.q(null, "data-order"), value: "1" }],
      children: []
    }
  ]
})

if (result.issues) {
  console.error(result.issues)
}
```

For key-value backends, `Schema.samples.kvFragmentRegistry` applies the same
capabilities while surfacing metadata such as bucket names. Both samples remain
Effect-native and can be inspected via `Schema.extensionsByAdapter`.

## Documentation

API references live under `docs/modules` (generated via `pnpm docgen`). Relevant
entries include `docs/modules/index.md` for the top-level exports and
`docs/modules/adapters_HappyMiniDom.md` / `docs/modules/adapters_WindowMiniDom.md`
for adapter-specific notes.
