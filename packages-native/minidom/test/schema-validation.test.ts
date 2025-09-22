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

const repeatingRegistry = Schema.registry([
  Schema.element({
    name: Schema.q(HTML, "ul"),
    content: Schema.content.sequence([
      Schema.content.zeroOrMore(Schema.content.element(Schema.q(HTML, "li")))
    ]),
    attributes: []
  }),
  Schema.element({
    name: Schema.q(HTML, "li"),
    content: Schema.content.sequence([]),
    attributes: []
  })
])

const choiceRegistry = Schema.registry([
  Schema.element({
    name: Schema.q(HTML, "figure"),
    content: Schema.content.sequence([
      Schema.content.choice([
        Schema.content.element(Schema.q(HTML, "img")),
        Schema.content.element(Schema.q(HTML, "video"))
      ])
    ]),
    attributes: []
  }),
  Schema.element({
    name: Schema.q(HTML, "img"),
    content: Schema.content.sequence([]),
    attributes: []
  }),
  Schema.element({
    name: Schema.q(HTML, "video"),
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

  it.effect("allows zeroOrMore repetitions", () =>
    Effect.gen(function*() {
      const node = {
        name: Schema.q(HTML, "ul"),
        attributes: [],
        children: [
          { name: Schema.q(HTML, "li"), attributes: [], children: [] },
          { name: Schema.q(HTML, "li"), attributes: [], children: [] },
          { name: Schema.q(HTML, "li"), attributes: [], children: [] }
        ]
      }

      const result = yield* Schema.validate(repeatingRegistry, node)

      expect(result.ok).toBe(true)
    }))

  it.effect("enforces oneOrMore repetitions", () =>
    Effect.gen(function*() {
      const navRegistry = Schema.registry([
        Schema.element({
          name: Schema.q(HTML, "nav"),
          content: Schema.content.sequence([
            Schema.content.oneOrMore(Schema.content.element(Schema.q(HTML, "a")))
          ]),
          attributes: []
        }),
        Schema.element({
          name: Schema.q(HTML, "a"),
          content: Schema.content.sequence([]),
          attributes: []
        })
      ])

      const node = { name: Schema.q(HTML, "nav"), children: [], attributes: [] }
      const result = yield* Schema.validate(navRegistry, node)

      expect(result.ok).toBe(false)
      expect(Option.isSome(result.issues)).toBe(true)
    }))

  it.effect("supports choice expressions", () =>
    Effect.gen(function*() {
      const node = {
        name: Schema.q(HTML, "figure"),
        attributes: [],
        children: [
          { name: Schema.q(HTML, "video"), attributes: [], children: [] }
        ]
      }

      const result = yield* Schema.validate(choiceRegistry, node)

      expect(result.ok).toBe(true)
    }))
})
