import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

const registry = Schema.registry([
  Schema.element({
    name: Schema.q(HTML, "div"),
    content: Schema.content.sequence([
      Schema.content.optional(Schema.content.element(Schema.q(HTML, "span"))),
      Schema.content.element(Schema.q(HTML, "p"))
    ]),
    attributes: [Schema.attribute({ name: Schema.q(null, "id"), required: true })]
  }),
  Schema.element({
    name: Schema.q(HTML, "span"),
    content: Schema.content.sequence([]),
    attributes: []
  }),
  Schema.element({
    name: Schema.q(HTML, "p"),
    content: Schema.content.sequence([]),
    attributes: []
  })
])

describe("MiniDomX Registry validation", () => {
  it.effect("accepts matching structures", () =>
    Effect.gen(function*() {
      const node = {
        name: Schema.q(HTML, "div"),
        children: [
          {
            name: Schema.q(HTML, "span"),
            children: [],
            attributes: []
          },
          {
            name: Schema.q(HTML, "p"),
            children: [],
            attributes: []
          }
        ],
        attributes: [{ name: Schema.q(null, "id"), value: "hero" }]
      }

      const result = yield* Schema.validate(registry, node)

      expect(result.ok).toBe(true)
      expect(result.issues).toStrictEqual(Option.none())
    }))

  it.effect("flags missing required attributes", () =>
    Effect.gen(function*() {
      const node = {
        name: Schema.q(HTML, "div"),
        children: [
          {
            name: Schema.q(HTML, "p"),
            children: [],
            attributes: []
          }
        ],
        attributes: []
      }

      const result = yield* Schema.validate(registry, node)

      expect(result.ok).toBe(false)
      expect(Option.isSome(result.issues)).toBe(true)
    }))

  it.effect("reports unexpected children", () =>
    Effect.gen(function*() {
      const node = {
        name: Schema.q(HTML, "div"),
        children: [
          {
            name: Schema.q(HTML, "span"),
            children: [],
            attributes: []
          },
          {
            name: Schema.q(HTML, "span"),
            children: [],
            attributes: []
          }
        ],
        attributes: [{ name: Schema.q(null, "id"), value: "hero" }]
      }

      const result = yield* Schema.validate(registry, node)

      expect(result.ok).toBe(false)
      expect(Option.isSome(result.issues)).toBe(true)
    }))
})
