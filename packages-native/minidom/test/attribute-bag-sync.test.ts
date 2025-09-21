import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { AttributeBag, Sync } from "@effect-native/minidom"

describe("AttributeBag Sync integration", () => {
  it.effect("provides AttributeBag service via Layer for synchronous adapters", () =>
    Effect.gen(function*() {
      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* AttributeBag.Tag
          yield* service.set(null, "id", "root")
          yield* service.set("http://www.w3.org/1999/xhtml", "class", "hero")
          const snapshot = yield* service.snapshot()
          return snapshot.size
        }),
        AttributeBag.layer()
      )

      const capability = Sync.detect(() => program)

      expect(Option.isSome(capability)).toBe(true)
      expect(Option.map(capability, (sync) => sync.run(program))).toStrictEqual(Option.some(2))
    }))

  it.effect("flags asynchronous AttributeBag adapters as non-sync while preserving behavior", () =>
    Effect.gen(function*() {
      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* AttributeBag.Tag
          yield* service.set(null, "id", "remote")
          return yield* service.get(null, "id")
        }),
        AttributeBag.layerAsync()
      )

      const capability = Sync.detect(() => program)

      expect(Option.isNone(capability)).toBe(true)
      expect(yield* program).toStrictEqual(Option.some("remote"))
    }))
})
