import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import { AttributeBag, MiniDomError, Transaction } from "@effect-native/minidom"

describe("AttributeBag transaction capability (FR1.11 / H14)", () => {
  it.effect("is exposed via AttributeBag.transaction", () =>
    Effect.gen(function*() {
      const bag = AttributeBag.make()
      const capability = AttributeBag.transaction(bag)

      const attempt = yield* Transaction.run(capability, Effect.void).pipe(Effect.either)

      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Unsupported)
      }
    }))
})
