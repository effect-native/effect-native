import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite, MiniDomError } from "@effect-native/minidom"

describe("Hybrid composite adversarial refresh (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H2)", () => {
  it.effect("reports conflicting adapters in refresh error", () =>
    Effect.gen(function*() {
      const remoteBag = AttributeBag.makeAsync({
        initial: [[null, "status", "cold"]],
        loadInitial: () => Effect.succeed([[null, "status", "stale"]])
      })

      const composite = yield* Composite.makeRouter({
        adapters: {
          remote: {
            bag: remoteBag,
            transaction: AttributeBag.transaction(remoteBag)
          }
        },
        resolve: () => "remote"
      })

      yield* composite.set(null, "status", "fresh")

      const refresh = yield* composite.refresh().pipe(Effect.either)

      expect(refresh._tag).toBe("Left")
      if (refresh._tag === "Left") {
        const cause = refresh.left
        expect(cause).toBeInstanceOf(MiniDomError.Conflict)
        if (cause instanceof MiniDomError.Conflict) {
          expect(cause.cause).toEqual({ adapters: ["remote"] })
        }
      }

      const status = yield* composite.get(null, "status")
      expect(status).toEqual(Option.some("fresh"))
    }))
})
