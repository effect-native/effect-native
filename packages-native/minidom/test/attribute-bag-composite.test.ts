import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag } from "@effect-native/minidom"

describe("AttributeBag composite refresh (H2/H6)", () => {
  it.effect("refresh propagates without racing between local and remote stores", () =>
    Effect.gen(function*() {
      const local = AttributeBag.service({
        initial: [[null, "theme", "dark"]]
      })

      const remote = AttributeBag.asyncService({
        loadInitial: () =>
          Effect.sync(() => [[null, "theme", "remote"]] as const)
      })

      const firstLocal = yield* local.get(null, "theme")
      const firstRemote = yield* remote.get(null, "theme")

      yield* AttributeBag.refresh(remote)

      const secondLocal = yield* local.get(null, "theme")
      const secondRemote = yield* remote.get(null, "theme")

      expect(firstLocal).toStrictEqual(Option.some("dark"))
      expect(firstRemote).toStrictEqual(Option.some("remote"))
      expect(secondLocal).toStrictEqual(Option.some("dark"))
      expect(secondRemote).toStrictEqual(Option.some("remote"))
    }))
})
