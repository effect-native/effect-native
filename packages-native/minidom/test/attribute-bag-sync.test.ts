import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as MiniDom from "@effect-native/minidom"

describe("AttributeBag Sync integration", () => {
  it.effect("provides AttributeBag service via Layer for synchronous adapters", () =>
    Effect.gen(function*() {
      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* MiniDom.AttributeBag.AttributeBag
          yield* service.set(null, "id", "root")
          yield* service.set("http://www.w3.org/1999/xhtml", "class", "hero")
          const snapshot = yield* service.snapshot()
          return snapshot.size
        }),
        MiniDom.AttributeBag.layer()
      )

      const capability = MiniDom.SyncCapability.detect(() => program.pipe(Effect.orDie))

      assert.isTrue(Option.isSome(capability))
      assert.deepStrictEqual(Option.map(capability, (sync) => sync.run(program.pipe(Effect.orDie))), Option.some(2))
    }))

  it.effect("flags asynchronous AttributeBag adapters as non-sync while preserving behavior", () =>
    Effect.gen(function*() {
      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* MiniDom.AttributeBag.AttributeBag
          yield* service.set(null, "id", "remote")
          return yield* service.get(null, "id")
        }),
        MiniDom.AttributeBag.layerAsync()
      )

      const capability = MiniDom.SyncCapability.detect(() => program.pipe(Effect.orDie))

      assert.isTrue(Option.isNone(capability))
      assert.deepStrictEqual(yield* program, Option.some("remote"))
    }))
})
