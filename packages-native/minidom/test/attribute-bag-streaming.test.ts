import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as MiniDom from "@effect-native/minidom"

describe("AttributeBag lazy streaming", () => {
  it.effect("loads remote attributes exactly once via async loader", () =>
    Effect.gen(function*() {
      let loadCount = 0

      const bag = MiniDom.AttributeBag.asyncService({
        loadInitial: () =>
          Effect.async((resume) => {
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

      expect(loadCount).toBe(1)
      expect(first).toStrictEqual(Option.some("remote"))
      expect(second).toStrictEqual(Option.some("remote"))
      expect(classAttr).toStrictEqual(Option.some("article"))

      const capability = MiniDom.Sync.detect(() => bag.get(null, "id"))
      expect(Option.isNone(capability)).toBe(true)
    }))

  it.effect("refreshes once after delete triggers new loader", () =>
    Effect.gen(function*() {
      let loadCount = 0

      const loader = () =>
        Effect.async((resume) => {
          loadCount += 1
          setTimeout(() => {
            resume(Effect.succeed<ReadonlyArray<readonly [string | null, string, string]>>([
              [null, "token", `refresh-${loadCount}`]
            ]))
          }, 0)
        })

      const bag = MiniDom.AttributeBag.asyncService({ loadInitial: loader })

      const firstToken = yield* bag.get(null, "token")
      expect(loadCount).toBe(1)
      expect(firstToken).toStrictEqual(Option.some("refresh-1"))

      yield* bag.delete(null, "token")
      const secondToken = yield* bag.get(null, "token")

      expect(loadCount).toBe(2)
      expect(secondToken).toStrictEqual(Option.some("refresh-2"))

      const capability = MiniDom.Sync.detect(() => bag.get(null, "token"))
      expect(Option.isNone(capability)).toBe(true)
    }))
})
