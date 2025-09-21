import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Standard Schema export [FR1.3][FR1.4][FR1.14][SC7.3]", () => {
  it("produces a Standard Schema v1 validator for registry snapshots", async () => {
    const registry = Schema.registry([
      Schema.element({
        name: Schema.q(HTML, "article"),
        content: Schema.content.sequence([
          Schema.content.optional(Schema.content.element(Schema.q(HTML, "section")))
        ]),
        attributes: [
          Schema.attribute({
            name: Schema.q(null, "data-slug"),
            required: true
          })
        ]
      }),
      Schema.element({
        name: Schema.q(HTML, "section"),
        content: Schema.content.sequence([]),
        attributes: []
      })
    ])

    const standard = Schema.toStandardSchemaV1(registry)

    const ok = await standard["~standard"].validate({
      name: Schema.q(HTML, "article"),
      attributes: [{ name: Schema.q(null, "data-slug"), value: "intro" }],
      children: [
        {
          name: Schema.q(HTML, "section"),
          attributes: [],
          children: []
        }
      ]
    })

    expect(ok.issues).toBeUndefined()

    const bad = await standard["~standard"].validate({
      name: Schema.q(HTML, "article"),
      attributes: [],
      children: []
    })

    expect(bad.issues?.[0]?.message).toMatch(/missing attribute data-slug/i)
  })
})
