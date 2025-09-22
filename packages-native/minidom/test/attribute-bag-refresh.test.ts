import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag } from "@effect-native/minidom"

describe("AttributeBag refresh capability (H6)", () => {
  it.effect("reruns loader after manual refresh", () =>
    Effect.gen(function*() {
      let loadCount = 0

      const bag = AttributeBag.makeAsync({
        loadInitial: () =>
          Effect.sync(() => {
            loadCount += 1
            return [
              [null, "token", `value-${loadCount}`] as const
            ]
          })
      })

      const first = yield* bag.get(null, "token")
      expect(first).toStrictEqual(Option.some("value-1"))
      expect(loadCount).toBe(1)

      yield* AttributeBag.refresh(bag)

      const second = yield* bag.get(null, "token")
      expect(second).toStrictEqual(Option.some("value-2"))
      expect(loadCount).toBe(2)
    }))
})
