import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX adapter metadata grouping", () => {
  it("groups element and attribute metadata per adapter", () => {
    const registry = Schema.registry([
      Schema.element({
        name: Schema.q(HTML, "article"),
        content: Schema.content.sequence([]),
        attributes: [
          Schema.attribute({
            name: Schema.q(null, "data-slug"),
            extensions: { sql: { column: "slug" } }
          })
        ],
        extensions: { sql: { table: "articles" } }
      })
    ])

    const groups = Schema.extensionsByAdapter(registry)

    expect(groups.sql?.elements[0]?.metadata).toEqual({ table: "articles" })
    expect(groups.sql?.attributes[0]?.metadata).toEqual({ column: "slug" })
  })
})
