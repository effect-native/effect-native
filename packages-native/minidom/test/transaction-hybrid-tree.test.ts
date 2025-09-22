import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite } from "@effect-native/minidom"

describe("Hybrid tree integration (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H2 / H6 / H14 / H22)", () => {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

  it.effect("routes transactions across html, svg, and remote adapters", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const svgBag = AttributeBag.makeSync({ initial: [[SVG_NAMESPACE, "fill", "green"]] })
      const remoteBag = AttributeBag.makeAsync({
        initial: [[null, "status", "cold"]],
        loadInitial: () => Effect.succeed([[null, "status", "reloaded"]])
      })

      const composite = yield* Composite.makeRouter({
        adapters: {
          html: {
            bag: htmlBag,
            transaction: AttributeBag.transaction(htmlBag)
          },
          svg: {
            bag: svgBag,
            transaction: AttributeBag.transaction(svgBag),
            capabilities: {
              composite: { ownership: "read-only" }
            }
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

          return name === "status" ? "remote" : "html"
        }
      })

      yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: composite.set(null, "title", "updated")
      })

      const htmlTitle = yield* composite.get(null, "title")
      expect(htmlTitle).toEqual(Option.some("updated"))

      const svgFill = yield* composite.get(SVG_NAMESPACE, "fill")
      expect(svgFill).toEqual(Option.some("green"))

      yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "status",
        effect: composite.set(null, "status", "warm")
      })

      const warmStatus = yield* composite.get(null, "status")
      expect(warmStatus).toEqual(Option.some("warm"))
    }))
})
