import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as S from "effect/Schema"

import * as MiniDomSchema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Effect Schema integration [FR1.3][SC7.3]", () => {
  it.effect("decodes valid snapshots via Effect Schema", () =>
    Effect.gen(function*() {
      const schema = MiniDomSchema.toEffectSchema(MiniDomSchema.samples.sqlArticleRegistry)
      const decode = S.decodeUnknown(schema)

      const result = yield* decode({
        name: MiniDomSchema.q(HTML, "article"),
        attributes: [{ name: MiniDomSchema.q(null, "data-slug"), value: "intro" }],
        children: [
          {
            name: MiniDomSchema.q(HTML, "section"),
            attributes: [{ name: MiniDomSchema.q(null, "data-order"), value: "1" }],
            children: []
          }
        ]
      })

      expect(result.name.name).toBe("article")
    }))

  it.effect("fails validation for schema violations", () =>
    Effect.gen(function*() {
      const schema = MiniDomSchema.toEffectSchema(MiniDomSchema.samples.sqlArticleRegistry)
      const decode = S.decodeUnknown(schema)

      const result = yield* Effect.either(
        decode({
          name: MiniDomSchema.q(HTML, "article"),
          attributes: [],
          children: []
        })
      )

      expect(result._tag).toBe("Left")
    }))
})
