import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Schema", () => {
  it("creates expanded names with q", () => {
    const name = Schema.q(HTML, "div")

    expect(name.ns).toBe(HTML)
    expect(name.name).toBe("div")
  })

  it("defines a simple element schema", () => {
    const div = Schema.element({
      name: Schema.q(HTML, "div"),
      content: Schema.content.sequence([
        Schema.content.optional(Schema.content.element(Schema.q(HTML, "span")))
      ]),
      attributes: [Schema.attribute({ name: Schema.q(null, "id"), required: false })]
    })

    expect(div.name.name).toBe("div")
    expect(div.content.type).toBe("sequence")
    expect(div.attributes).toHaveLength(1)
  })
})
