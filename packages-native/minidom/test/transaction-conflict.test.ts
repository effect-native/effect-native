import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import { MiniDomError, TransactionCapability } from "@effect-native/minidom"

describe("MiniDom.Transaction capability (FR1.11 / SC7.8 / H14)", () => {
  it.effect("propagates conflicts via withTransaction", () =>
    Effect.gen(function*() {
      const conflict = new MiniDomError.Conflict({
        message: "simulated conflict",
        cause: new Error("write-write")
      })

      const passthrough = TransactionCapability.make((operation) => operation)

      const attempt = yield* TransactionCapability.run(passthrough, Effect.fail(conflict)).pipe(Effect.either)
      assert.strictEqual(attempt._tag, "Left")
      if (attempt._tag === "Left") {
        const error = attempt.left as MiniDomError.Conflict
        assert.instanceOf(error, MiniDomError.Conflict)
        assert.instanceOf(error.cause, Error)
      }

      const unsupported = TransactionCapability.unsupported({ message: "adapter missing transaction support" })
      const unsupportedAttempt = yield* TransactionCapability.run(unsupported, Effect.void).pipe(Effect.either)

      assert.strictEqual(unsupportedAttempt._tag, "Left")
      if (unsupportedAttempt._tag === "Left") {
        const error = unsupportedAttempt.left as MiniDomError.Unsupported
        assert.instanceOf(error, MiniDomError.Unsupported)
        assert.isTrue(error.message.includes("missing transaction support"))
      }
    }))
})
