import { describe, expect, expectTypeOf, it } from "@effect/vitest"

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

    const elementExtensions = entries[0]!.extensions
    expectTypeOf(elementExtensions).not.toBeAny()
    expectTypeOf(elementExtensions).toEqualTypeOf<{ sql: { table: string } } | undefined>()

    const attributeExtensions = entries[0]!.attributes[0]!.extensions
    expectTypeOf(attributeExtensions).not.toBeAny()
    expectTypeOf(attributeExtensions).toEqualTypeOf<{ sql: { column: string } } | undefined>()

    expect(elementExtensions?.sql.table).toBe("articles")
    expect(attributeExtensions?.sql.column).toBe("slug")
  })

  it("groups extensions by adapter namespace [FR1.14][SC7.11]", () => {
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
      }),
      Schema.element({
        name: Schema.q(HTML, "kv-resource"),
        content: Schema.content.sequence([]),
        attributes: [
          Schema.attribute({
            name: Schema.q(null, "data-key"),
            extensions: { kv: { bucket: "docs" } }
          })
        ],
        extensions: { kv: { collection: "resources" } }
      })
    ])

    const grouped = Schema.extensionsByAdapter(registry)

    expect(grouped.sql?.elements).toEqual([
      {
        name: Schema.q(HTML, "article"),
        metadata: { table: "articles" }
      }
    ])
    expect(grouped.sql?.attributes).toEqual([
      {
        element: Schema.q(HTML, "article"),
        name: Schema.q(null, "data-slug"),
        metadata: { column: "slug" }
      }
    ])

    expect(grouped.kv?.elements).toEqual([
      {
        name: Schema.q(HTML, "kv-resource"),
        metadata: { collection: "resources" }
      }
    ])
    expect(grouped.kv?.attributes).toEqual([
      {
        element: Schema.q(HTML, "kv-resource"),
        name: Schema.q(null, "data-key"),
        metadata: { bucket: "docs" }
      }
    ])
  })
})
