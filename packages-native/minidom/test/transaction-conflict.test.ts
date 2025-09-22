import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import { MiniDomError, TransactionCapability } from "@effect-native/minidom"

describe("MiniDom.Transaction capability (FR1.11 / SC7.8 / H14)", () => {
  it.effect("propagates conflicts via withTransaction", () =>
    Effect.gen(function*() {
      expect(TransactionCapability).toBeDefined()

      const conflict = new MiniDomError.Conflict({
        message: "simulated conflict",
        cause: new Error("write-write")
      })

      const passthrough = TransactionCapability.make((operation) => operation)

      const attempt = yield* TransactionCapability.run(passthrough, Effect.fail(conflict)).pipe(Effect.either)
      expect(attempt._tag).toBe("Left")
      if (attempt._tag === "Left") {
        expect(attempt.left).toBeInstanceOf(MiniDomError.Conflict)
        expect(attempt.left.cause).toBeInstanceOf(Error)
      }

      const unsupported = TransactionCapability.unsupported({ message: "adapter missing transaction support" })
      const unsupportedAttempt = yield* TransactionCapability.run(unsupported, Effect.void).pipe(Effect.either)

      expect(unsupportedAttempt._tag).toBe("Left")
      if (unsupportedAttempt._tag === "Left") {
        expect(unsupportedAttempt.left).toBeInstanceOf(MiniDomError.Unsupported)
        expect(unsupportedAttempt.left.message).toContain("missing transaction support")
      }
    }))
})
