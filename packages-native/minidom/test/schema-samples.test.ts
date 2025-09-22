import { describe, expect, it } from "@effect/vitest"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const
const KV = "https://schemas.effect-native.dev/minidom/kv" as const

describe("MiniDomX registry samples [FR1.3][FR1.14][SC7.11]", () => {
  it("exposes SQL-focused registry samples with standard schema support", async () => {
    const registry = Schema.samples.sqlArticleRegistry

    const grouped = Schema.extensionsByAdapter(registry)
    expect(grouped.sql?.elements[0]?.metadata).toMatchObject({ table: "articles" })

    const standard = Schema.toStandardSchemaV1(registry)

    const ok = await standard["~standard"].validate({
      name: Schema.q(HTML, "article"),
      attributes: [{ name: Schema.q(null, "data-slug"), value: "intro" }],
      children: [
        {
          name: Schema.q(HTML, "section"),
          attributes: [{ name: Schema.q(null, "data-order"), value: "1" }],
          children: []
        }
      ]
    })

    expect(ok.issues).toBeUndefined()
  })

  it("exposes KV-focused registry samples with adapter metadata", async () => {
    const registry = Schema.samples.kvFragmentRegistry

    const grouped = Schema.extensionsByAdapter(registry)
    expect(grouped.kv?.elements[0]?.metadata).toMatchObject({ collection: "fragments" })

    const bad = await Schema.toStandardSchemaV1(registry)["~standard"].validate({
      name: Schema.q(KV, "fragment"),
      attributes: [],
      children: []
    })

    expect(bad.issues?.[0]?.message).toMatch(/missing attribute data-key/i)
  })
})
