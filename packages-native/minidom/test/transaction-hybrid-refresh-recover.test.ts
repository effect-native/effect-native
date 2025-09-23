import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Composite } from "@effect-native/minidom"

describe("Hybrid refresh recovery (FR1.10 / FR1.11 / SC7.7 / SC7.8 / H2 / H6 / H14 / H22)", () => {
  it.effect("succeeds after resolving conflict", () =>
    Effect.gen(function*() {
      const remoteBag = AttributeBag.makeAsync({
        effect: Effect.succeed<ReadonlyArray<readonly [string | null, string, string]>>([
          [null, "status", "cold"]
        ])
      })

      yield* AttributeBag.refresh(remoteBag)

      const composite = yield* Composite.makeRouter({
        adapters: {
          remote: {
            bag: remoteBag,
            transaction: AttributeBag.transaction(remoteBag)
          }
        },
        resolve: () => "remote"
      })

      yield* Composite.runTransaction(composite, {
        namespace: null,
        name: "status",
        effect: composite.set(null, "status", "warm")
      })

      yield* composite.refresh().pipe(Effect.catchTag("MiniDomError.Conflict", () => Effect.void))

      const afterConflict = yield* composite.get(null, "status")
      expect(afterConflict).toEqual(Option.some("warm"))

      const secondRefresh = yield* composite.refresh().pipe(Effect.either)
      expect(secondRefresh._tag).toBe("Left")

      const finalStatus = yield* composite.get(null, "status")
      expect(finalStatus).toEqual(Option.some("warm"))
    }))
})
