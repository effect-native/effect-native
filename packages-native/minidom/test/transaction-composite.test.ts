import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite, MiniDomError, Transaction } from "@effect-native/minidom"

describe("Composite transactions (FR1.11 / SC7.8 / H14)", () => {
  it.effect("delegates withTransaction to the owning adapter", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          local: {
            bag: AttributeBag.make({ initial: [] }),
            capabilities: {
              composite: { ownership: "read-write" },
              transaction: Transaction.make((operation) => operation)
            }
          }
        },
        resolve: () => "local"
      })

      const conflict = new MiniDomError.Conflict({
        message: "simulated conflict"
      })

      const attempt = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: Effect.fail(conflict)
      }).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Conflict)
      }
    }))

  it.effect("fails when adapter has no transaction capability", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          local: {
            bag: AttributeBag.make({ initial: [[null, "title", "draft"]] })
          }
        },
        resolve: () => "local"
      })

      const attempt = yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "title",
        effect: Effect.succeed(Option.none())
      }).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Unsupported)
        expect(attempt.left.message).toContain("transaction")
      }
    }))
})
