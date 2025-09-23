import { assert, describe, it } from "@effect/vitest"
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

      assert.deepStrictEqual(id, Option.some("root"))
      assert.deepStrictEqual(missing, Option.none<string>())
      assert.isTrue(yield* service.has("http://www.w3.org/1999/xhtml", "class"))

      const view = yield* service.snapshot()
      assert.strictEqual(view.size, 2)
      assert.deepStrictEqual(view.get(null, "id"), Option.some("root"))

      yield* service.delete(null, "id")
      assert.deepStrictEqual(view.get(null, "id"), Option.some("root"))
    }))

  it("creates independent views from entries", () => {
    const snapshot = MiniDom.AttributeBag.viewFromEntries([
      [null, "lang", "en"],
      ["http://www.w3.org/1999/xhtml", "class", "hero"]
    ])

    assert.deepStrictEqual(snapshot.get(null, "lang"), Option.some("en"))
    assert.isTrue(snapshot.has("http://www.w3.org/1999/xhtml", "class"))

    const entries = Array.from(snapshot.entries())
    entries.push([null, "ignored", "value"])

    assert.strictEqual(Array.from(snapshot.entries()).length, 2)
  })
})

describe("MiniDom Sync capability", () => {
  it("runs MiniDom programs synchronously", () => {
    const sync = MiniDom.SyncCapability.fromRunner((effect) => Effect.runSync(effect))

    assert.isTrue(MiniDom.SyncCapability.is(sync))

    const program = Effect.gen(function*() {
      const bag = MiniDom.AttributeBag.makeSync()
      yield* bag.set(null, "role", "banner")
      const view = yield* bag.snapshot()
      return view.size
    })

    const size = sync.run(program)
    assert.strictEqual(size, 1)
  })

  it("detects synchronous adapters", () => {
    const capability = MiniDom.SyncCapability.detect(() => Effect.sync(() => "ok"))

    assert.isTrue(Option.isSome(capability))
    assert.deepStrictEqual(capability.pipe(Option.map((sync) => sync.run(Effect.succeed("ok")))), Option.some("ok"))
  })

  it("flags asynchronous adapters as non-sync", () => {
    const capability = MiniDom.SyncCapability.detect(() =>
      Effect.async<string, never>((resume) => {
        setTimeout(() => resume(Effect.succeed("ok")), 0)
      })
    )

    assert.isTrue(Option.isNone(capability))
  })
})
