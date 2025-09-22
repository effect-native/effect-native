import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, MiniDomError, TransactionCapability } from "@effect-native/minidom"

describe("AttributeBag transaction capability (FR1.11 / H14)", () => {
  it.effect("commits successful effects", () =>
    Effect.gen(function*() {
      const bag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const capability = AttributeBag.transaction(bag)

      const program = Effect.gen(function*() {
        yield* bag.set(null, "title", "published")
        return yield* bag.get(null, "title")
      })

      const result = yield* TransactionCapability.run(capability, program)

      expect(result).toEqual(Option.some("published"))
    }))

  it.effect("rolls back when effect fails", () =>
    Effect.gen(function*() {
      const bag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
      const capability = AttributeBag.transaction(bag)

      const conflict = new MiniDomError.Conflict({ message: "write-write" })

      const failure = yield* TransactionCapability.run(
        capability,
        Effect.gen(function*() {
          yield* bag.set(null, "title", "conflicting")
          return yield* Effect.fail(conflict)
        })
      ).pipe(Effect.either)

      expect(failure._tag).toBe("Left")
      if (failure._tag === "Left") {
        expect(failure.left).toBe(conflict)
      }

      const value = yield* bag.get(null, "title")
      expect(value).toEqual(Option.some("draft"))
    }))
})
