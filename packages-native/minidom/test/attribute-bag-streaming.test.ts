import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

import * as MiniDom from "@effect-native/minidom"

describe("AttributeBag lazy streaming", () => {
  it.effect("loads remote attributes exactly once via async loader", () =>
    Effect.gen(function*() {
      let loadCount = 0

      const bag = MiniDom.AttributeBag.makeAsync({
        effect: Effect.async<ReadonlyArray<readonly [string | null, string, string]>, never>((resume) => {
          loadCount += 1
          setTimeout(() => {
            resume(Effect.succeed([
              [null, "id", "remote"],
              ["http://www.w3.org/1999/xhtml", "class", "article"]
            ]))
          }, 0)
        })
      })

      const first = yield* bag.get(null, "id")
      const second = yield* bag.get(null, "id")
      const classAttr = yield* bag.get("http://www.w3.org/1999/xhtml", "class")

      assert.strictEqual(loadCount, 1)
      assert.deepStrictEqual(first, Option.some("remote"))
      assert.deepStrictEqual(second, Option.some("remote"))
      assert.deepStrictEqual(classAttr, Option.some("article"))

      const capability = MiniDom.SyncCapability.detect(() => bag.get(null, "id").pipe(Effect.orDie))
      assert.isTrue(Option.isNone(capability))
    }))

  it.effect("refreshes once after delete triggers new loader", () =>
    Effect.gen(function*() {
      let loadCount = 0

      const loader = Effect.async<ReadonlyArray<readonly [string | null, string, string]>, never>((resume) => {
        loadCount += 1
        setTimeout(() => {
          resume(Effect.succeed([
            [null, "token", `refresh-${loadCount}`]
          ]))
        }, 0)
      })

      const bag = MiniDom.AttributeBag.makeAsync({ effect: loader })

      const firstToken = yield* bag.get(null, "token")
      assert.strictEqual(loadCount, 1)
      assert.deepStrictEqual(firstToken, Option.some("refresh-1"))

      yield* bag.delete(null, "token")
      const secondToken = yield* bag.get(null, "token")

      assert.strictEqual(loadCount, 2)
      assert.deepStrictEqual(secondToken, Option.some("refresh-2"))

      const capability = MiniDom.SyncCapability.detect(() => bag.get(null, "token").pipe(Effect.orDie))
      assert.isTrue(Option.isNone(capability))
    }))

  it.effect("wraps loader failures in AttributeBagError", () =>
    Effect.gen(function*() {
      const failingError = new Error("boom")

      const bag = MiniDom.AttributeBag.makeAsync<Error>({ effect: Effect.fail(failingError) })

      const exit = yield* bag.get(null, "missing").pipe(Effect.exit)

      assert.isTrue(Exit.isFailure(exit))
      assert.deepStrictEqual(exit, Exit.fail(new MiniDom.AttributeBag.AttributeBagError({ cause: failingError })))
    }))
})
