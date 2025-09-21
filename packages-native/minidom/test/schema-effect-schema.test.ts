import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"

import * as Schema from "@effect-native/minidom/Schema"

const HTML = "http://www.w3.org/1999/xhtml" as const

describe("MiniDomX Effect Schema bridge", () => {
  it.effect("produces an Effect Schema for attributes", () =>
    Effect.gen(function*() {
      const registry = Schema.registry([
        Schema.element({
          name: Schema.q(HTML, "div"),
          content: Schema.content.sequence([]),
          attributes: [
            Schema.attribute({ name: Schema.q(null, "id"), required: true }),
            Schema.attribute({ name: Schema.q(null, "class") })
          ]
        })
      ])

      const effectSchema = Schema.effectSchema(registry, Schema.q(HTML, "div"))
      const decode = yield* effectSchema.decode({
        id: "hero",
        class: "hero primary"
      })

      expect(decode.id).toBe("hero")
    }))

  it.effect("fails when required attributes are missing", () =>
    Effect.gen(function*() {
      const registry = Schema.registry([
        Schema.element({
          name: Schema.q(HTML, "section"),
          content: Schema.content.sequence([]),
          attributes: [Schema.attribute({ name: Schema.q(null, "data-key"), required: true })]
        })
      ])

      const effectSchema = Schema.effectSchema(registry, Schema.q(HTML, "section"))

      const failure = Effect.runSyncExit(effectSchema.decode({}))

      expect(Exit.isFailure(failure)).toBe(true)
    }))
})
