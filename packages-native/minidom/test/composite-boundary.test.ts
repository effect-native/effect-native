import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import { AttributeBag, Composite, MiniDomError } from "@effect-native/minidom"

describe("MiniDom.Composite ownership guard (FR1.10 / SC7.7)", () => {
  it.effect("fails write when adapter declares read-only ownership", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          reader: {
            bag: AttributeBag.makeSync({
              initial: [[null, "color", "blue"]]
            }),
            capabilities: {
              composite: { ownership: "read-only" }
            }
          }
        },
        resolve: () => "reader"
      })

      const result = yield* composite.set(null, "color", "green").pipe(Effect.either)

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MiniDomError.Unsupported)
        expect(result.left.message).toContain("read-only")
      }
    }))
})
