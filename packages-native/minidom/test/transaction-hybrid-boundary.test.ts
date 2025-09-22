import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite } from "@effect-native/minidom"

describe("Hybrid composite transaction boundaries (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H2 / H14 / H22)", () => {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

  it.effect("allows read access to other adapters while preserving transactional boundaries", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.make({ initial: [[null, "title", "draft"]] })
      const svgBag = AttributeBag.make({ initial: [[SVG_NAMESPACE, "fill", "green"]] })
      const remoteBag = AttributeBag.make({ initial: [[null, "status", "cold"]] })

      const composite = yield* Composite.makeRouter({
        adapters: {
          happy: {
            bag: htmlBag,
            transaction: AttributeBag.transaction(htmlBag)
          },
          svg: {
            bag: svgBag,
            transaction: AttributeBag.transaction(svgBag)
          },
          remote: {
            bag: remoteBag,
            transaction: AttributeBag.transaction(remoteBag)
          }
        },
        resolve: (namespace, name) => {
          if (namespace === SVG_NAMESPACE) {
            return "svg"
          }

          return name === "status" ? "remote" : "happy"
        }
      })

      const result = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: Effect.gen(function*() {
          const svgFill = yield* composite.get(SVG_NAMESPACE, "fill")
          expect(svgFill).toEqual(Option.some("green"))

          const remoteStatus = yield* composite.get(null, "status")
          expect(remoteStatus).toEqual(Option.some("cold"))

          yield* composite.set(null, "title", "committed")

          return yield* composite.get(null, "title")
        })
      })

      expect(result).toEqual(Option.some("committed"))

      const finalStatus = yield* composite.get(null, "status")
      expect(finalStatus).toEqual(Option.some("cold"))
    }))
})
