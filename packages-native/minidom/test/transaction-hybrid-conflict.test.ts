import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite, MiniDomError } from "@effect-native/minidom"

describe("Hybrid composite remote transactions (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H6 / H14 / H22)", () => {
  it.effect("commits async remote transactions", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const remoteBag = AttributeBag.makeAsync({
        effect: Effect.succeed<ReadonlyArray<readonly [string | null, string, string]>>([
          [null, "status", "cold"]
        ])
      })

      yield* AttributeBag.refresh(remoteBag)

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

      yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "status",
        effect: composite.set(null, "status", "warm")
      })

      const status = yield* composite.get(null, "status")
      expect(status).toEqual(Option.some("warm"))
    }))

  it.effect("rolls back async remote transactions on failure", () =>
    Effect.gen(function*() {
      const htmlBag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const remoteBag = AttributeBag.makeAsync({
        effect: Effect.succeed<ReadonlyArray<readonly [string | null, string, string]>>([
          [null, "status", "cold"]
        ])
      })

      yield* AttributeBag.refresh(remoteBag)

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

      const conflict = new MiniDomError.Conflict({ message: "remote write conflict" })

      const attempt = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "status",
        effect: Effect.gen(function*() {
          yield* composite.set(null, "status", "pending")
          return yield* Effect.fail(conflict)
        })
      }).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBe(conflict)
      }

      const status = yield* composite.get(null, "status")
      expect(status).toEqual(Option.some("cold"))
    }))
})
