import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite, MiniDomError } from "@effect-native/minidom"

describe("Hybrid composite transactions (FR1.11 / SC7.7 / SC7.8 / H2 / H14)", () => {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

  it.effect("allows transactions confined to the owning adapter", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const svgBag = AttributeBag.makeSync()

      const composite = yield* Composite.makeRouter({
        adapters: {
          html: {
            bag: htmlBag,
            transaction: AttributeBag.transaction(htmlBag)
          },
          svg: {
            bag: svgBag,
            transaction: AttributeBag.transaction(svgBag)
          }
        },
        resolve: (namespace) => (namespace === SVG_NAMESPACE ? "svg" : "html")
      })

      yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: composite.set(null, "title", "committed")
      })

      const htmlTitle = yield* composite.get(null, "title")
      expect(htmlTitle).toEqual(Option.some("committed"))

      const svgFill = yield* composite.get(SVG_NAMESPACE, "fill")
      expect(svgFill).toEqual(Option.none())
    }))

  it.effect("rejects cross-adapter mutations during a transaction", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const svgBag = AttributeBag.makeSync()

      const composite = yield* Composite.makeRouter({
        adapters: {
          html: {
            bag: htmlBag,
            transaction: AttributeBag.transaction(htmlBag)
          },
          svg: {
            bag: svgBag,
            transaction: AttributeBag.transaction(svgBag)
          }
        },
        resolve: (namespace) => (namespace === SVG_NAMESPACE ? "svg" : "html")
      })

      const attempt = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: Effect.gen(function*() {
          yield* composite.set(null, "title", "pending")
          return yield* composite.set(SVG_NAMESPACE, "fill", "blue")
        })
      }).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Unsupported)
        expect(attempt.left.message).toContain("transaction")
      }

      const htmlTitle = yield* composite.get(null, "title")
      expect(htmlTitle).toEqual(Option.some("draft"))

      const svgFill = yield* composite.get(SVG_NAMESPACE, "fill")
      expect(svgFill).toEqual(Option.none())
    }))
})
