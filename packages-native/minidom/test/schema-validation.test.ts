import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Registry validation", () => {
  it.effect("returns empty issues for matching structures", () =>
    Effect.gen(function*() {
      const registry = Schema.registry([
        Schema.element({
          name: Schema.q(HTML, "div"),
          content: Schema.content.sequence([
            Schema.content.optional(Schema.content.element(Schema.q(HTML, "span")))
          ]),
          attributes: [Schema.attribute({ name: Schema.q(null, "id") })]
        }),
        Schema.element({
          name: Schema.q(HTML, "span"),
          content: Schema.content.optional(Schema.content.element(Schema.q(HTML, "a"))),
          attributes: []
        })
      ])

      const result = yield* Schema.validate(registry, {
        name: Schema.q(HTML, "div"),
        children: [
          {
            name: Schema.q(HTML, "span"),
            children: [],
            attributes: []
          }
        ],
        attributes: [{ name: Schema.q(null, "id"), value: "hero" }]
      })

      expect(result.ok).toBe(true)
      expect(Option.isNone(result.issues)).toBe(true)
    }))

  it.effect("reports missing required attributes", () =>
    Effect.gen(function*() {
      const registry = Schema.registry([
        Schema.element({
          name: Schema.q(HTML, "div"),
          content: Schema.content.sequence([]),
          attributes: [Schema.attribute({ name: Schema.q(null, "id"), required: true })]
        })
      ])

      const result = yield* Schema.validate(registry, {
        name: Schema.q(HTML, "div"),
        children: [],
        attributes: []
      })

      expect(result.ok).toBe(false)
      expect(Option.isSome(result.issues)).toBe(true)
    }))
})
