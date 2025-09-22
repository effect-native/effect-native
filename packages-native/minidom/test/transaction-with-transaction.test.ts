import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, MiniDomError, TransactionCapability } from "@effect-native/minidom"

describe("Transaction.withTransaction helper (FR1.11 / SC7.8 / H14)", () => {
  it.effect("commits wrapped effects", () =>
    Effect.gen(function*() {
      const bag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const capability = AttributeBag.transaction(bag)

      const commit = Effect.gen(function*() {
        yield* bag.set(null, "title", "published")
        return yield* bag.get(null, "title")
      })

      const result = yield* TransactionCapability.withTransaction(capability)(commit)

      expect(result).toEqual(Option.some("published"))
    }))

  it.effect("rolls back on conflict and surfaces MiniDomError.Conflict", () =>
    Effect.gen(function*() {
      const bag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const capability = AttributeBag.transaction(bag)
      const conflict = new MiniDomError.Conflict({ message: "write-write" })

      const failure = yield* TransactionCapability.withTransaction(capability)(
        Effect.gen(function*() {
          yield* bag.set(null, "title", "conflicting")
          return yield* Effect.fail(conflict)
        })
      ).pipe(Effect.either)

      expect(failure._tag).toBe("Left")
      if (failure._tag === "Left") {
        expect(failure.left).toBe(conflict)
      }

      const finalValue = yield* bag.get(null, "title")
      expect(finalValue).toEqual(Option.some("draft"))
    }))
})
