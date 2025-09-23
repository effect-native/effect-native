import * as Reactivity from "@effect/experimental/Reactivity"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

import * as MiniDom from "@effect-native/minidom"

describe("MiniDom.Events", () => {
  const acquireEvents = MiniDom.Events.make.pipe(
    Effect.provideServiceEffect(Reactivity.Reactivity, Reactivity.make)
  )

  it.effect("query delivers updates after mutation", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const events = yield* acquireEvents
        const ref = yield* Ref.make(0)

        const mailbox = yield* events.query(["counter"], Ref.get(ref))

        const first = yield* mailbox.take
        assert.strictEqual(first, 0)

        yield* events.mutation(["counter"], Ref.set(ref, 1))
        yield* Effect.yieldNow()

        const second = yield* mailbox.take
        assert.strictEqual(second, 1)
      })
    ))

  it.effect("invalidate triggers re-fetch", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const events = yield* acquireEvents
        const ref = yield* Ref.make(0)

        const mailbox = yield* events.query(["counter"], Ref.get(ref))
        yield* mailbox.take

        yield* Ref.set(ref, 42)
        yield* events.invalidate(["counter"])
        yield* Effect.yieldNow()

        const next = yield* mailbox.take
        assert.strictEqual(next, 42)
      })
    ))
})
