import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

describe("MiniDomX schema extensions", () => {
  it("stores typed extensions when provided", () => {
    const element = Schema.element({
      name: Schema.q("http://www.w3.org/1999/xhtml", "article"),
      content: Schema.content.sequence([]),
      attributes: [],
      extensions: {
        sql: { table: "articles" },
        kv: { prefix: "article:" }
      }
    })

    expect(element.extensions?.sql?.table).toBe("articles")
  })
})
