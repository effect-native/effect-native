import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite, MiniDomError } from "@effect-native/minidom"

describe("Hybrid composite reload during transaction (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H2 / H6 / H14 / H22)", () => {
  it.effect("treats remote refresh during transaction as conflict", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.make({ initial: [[null, "title", "draft"]] })
      const remoteBag = AttributeBag.asyncService({
        initial: [[null, "status", "cold"]],
        loadInitial: () => Effect.succeed<Iterable<readonly [null, string, string]>>([[null, "status", "reloaded"]])
      })

      const composite = yield* Composite.makeRouter({
        adapters: {
          html: {
            bag: htmlBag,
            transaction: AttributeBag.transaction(htmlBag)
          },
          remote: {
            bag: remoteBag,
            transaction: AttributeBag.transaction(remoteBag)
          }
        },
        resolve: (_namespace, name) => (name === "status" ? "remote" : "html")
      })

      const attempt = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "status",
        effect: Effect.gen(function*() {
          yield* composite.set(null, "status", "warm")
          yield* composite.refresh()
          return yield* composite.get(null, "status")
        })
      }).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Conflict)
      }

      const finalStatus = yield* composite.get(null, "status")
      expect(finalStatus).toEqual(Option.some("cold"))
    }))
})
