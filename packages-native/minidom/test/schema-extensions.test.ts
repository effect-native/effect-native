import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Schema extensions [FR1.14][SC7.11]", () => {
  it("exposes typed extensions via builders [FR1.14][SC7.11]", () => {
    const articleElement = Schema.element({
      name: Schema.q(HTML, "article"),
      content: Schema.content.sequence([]),
      attributes: [
        Schema.attribute({
          name: Schema.q(null, "data-slug"),
          required: true,
          extensions: { sql: { column: "slug" } }
        })
      ],
      extensions: { sql: { table: "articles" } }
    })

    expect(articleElement.extensions).toEqual({ sql: { table: "articles" } })

    const attribute = articleElement.attributes[0]!
    expect(attribute.extensions).toEqual({ sql: { column: "slug" } })

    const registry = Schema.registry([articleElement])
    const entries = Array.from(registry.elements.values())
    expect(entries).toHaveLength(1)
    expect(entries[0]!.extensions).toEqual({ sql: { table: "articles" } })
  })
})
