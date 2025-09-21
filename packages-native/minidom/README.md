# @effect-native/minidom

Typed, capability-driven MiniDom abstractions for Effect Native runtimes.

## Status

This package is under active development and not yet published.

## Registry samples & validation

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
