import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as MiniDom from "@effect-native/minidom"

describe("MiniDom AttributeBag", () => {
  it.effect("service operations return Effects and track namespaces", () =>
    Effect.gen(function*() {
      const service = MiniDom.AttributeBag.makeSync()

      yield* service.set("http://www.w3.org/1999/xhtml", "class", "hero")
      yield* service.set(null, "id", "root")

      const id = yield* service.get(null, "id")
      const missing = yield* service.get("http://www.w3.org/2000/svg", "id")

      expect(id).toStrictEqual(Option.some("root"))
      expect(missing).toStrictEqual(Option.none<string>())
      expect(yield* service.has("http://www.w3.org/1999/xhtml", "class")).toBe(true)

      const view = yield* service.snapshot()
      expect(view.size).toBe(2)
      expect(view.get(null, "id")).toStrictEqual(Option.some("root"))

      yield* service.delete(null, "id")
      expect(view.get(null, "id")).toStrictEqual(Option.some("root"))
    }))

  it("creates independent views from entries", () => {
    const snapshot = MiniDom.AttributeBag.viewFromEntries([
      [null, "lang", "en"],
      ["http://www.w3.org/1999/xhtml", "class", "hero"]
    ])

    expect(snapshot.get(null, "lang")).toStrictEqual(Option.some("en"))
    expect(snapshot.has("http://www.w3.org/1999/xhtml", "class")).toBe(true)

    const entries = Array.from(snapshot.entries())
    entries.push([null, "ignored", "value"])

    expect(Array.from(snapshot.entries())).toHaveLength(2)
  })
})

describe("MiniDom Sync capability", () => {
  it("runs MiniDom programs synchronously", () => {
    const sync = MiniDom.SyncCapability.fromRunner((effect) => Effect.runSync(effect))

    expect(MiniDom.SyncCapability.is(sync)).toBe(true)

    const program = Effect.gen(function*() {
      const bag = MiniDom.AttributeBag.makeSync()
      yield* bag.set(null, "role", "banner")
      const view = yield* bag.snapshot()
      return view.size
    })

    const size = sync.run(program)
    expect(size).toBe(1)
  })

  it("detects synchronous adapters", () => {
    const capability = MiniDom.SyncCapability.detect(() => Effect.sync(() => "ok"))

    expect(Option.isSome(capability)).toBe(true)
    expect(capability.pipe(Option.map((sync) => sync.run(Effect.succeed("ok"))))).toStrictEqual(Option.some("ok"))
  })

  it("flags asynchronous adapters as non-sync", () => {
    const capability = MiniDom.SyncCapability.detect(() =>
      Effect.async<never, string, never>((resume) => {
        setTimeout(() => resume(Effect.succeed("ok")), 0)
      })
    )

    expect(Option.isNone(capability)).toBe(true)
  })
})
