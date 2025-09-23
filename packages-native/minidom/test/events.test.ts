import * as Reactivity from "@effect/experimental/Reactivity"
import { assert, layer } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as TestClock from "effect/TestClock"
import * as TestContext from "effect/TestContext"
import * as TestServices from "effect/TestServices"

import * as MiniDom from "@effect-native/minidom"

const baseLayer = Layer.mergeAll(
  Layer.scope,
  TestContext.LiveContext,
  TestServices.annotationsLayer(),
  TestServices.liveLayer(),
  TestClock.defaultTestClock
)

layer(baseLayer)("MiniDom events", (it) => {
  it.layer(MiniDom.Events.layer)("events", (it) => {
    it.effect("MiniDom.Events query emits on mutation", () =>
      Effect.gen(function* () {
        yield* MiniDom.Events.Tag
        const ref = yield* Ref.make(0)

        const mailbox = yield* MiniDom.Events.query(["node:query"])(Ref.get(ref))

        const first = yield* mailbox.take
        assert.strictEqual(first, 0)

        yield* MiniDom.Events.mutation(["node:query"])(Ref.set(ref, 1))
        yield* Effect.yieldNow()

        const second = yield* mailbox.take
        assert.strictEqual(second, 1)
      })
    )

    it.effect("MiniDom.Events invalidate shortcuts polling", () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(0)
        const mailbox = yield* MiniDom.Events.query(["node:latency"])(Ref.get(ref))
        yield* mailbox.take
        const pollFiber = yield* Effect.gen(function* () {
          while (true) {
            yield* TestClock.sleep(Duration.millis(100))
            const current = yield* Ref.get(ref)
            if (current === 1) {
              return current
            }
          }
        }).pipe(Effect.fork)

        yield* MiniDom.Events.mutation(["node:latency"])(Ref.set(ref, 1))
        yield* Effect.yieldNow()

        const eventValue = yield* mailbox.take
        assert.strictEqual(eventValue, 1)

        const polledBefore = yield* Fiber.poll(pollFiber)
        assert.strictEqual(polledBefore._tag, "None")

        yield* TestClock.adjust(Duration.millis(100))

        const polledAfter = yield* Fiber.join(pollFiber)
        assert.strictEqual(polledAfter, 1)
      })
    )

    it.effect("MiniDom.Events invalidate completes", () => MiniDom.Events.invalidate(["noop"]))
  })

  it.layer(Reactivity.layer)("Reactivity baseline", (it) => {
    it.effect("Reactivity query baseline", () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(0)
        const mailbox = yield* Reactivity.query(["baseline"])(Ref.get(ref))

        const initial = yield* mailbox.take
        assert.strictEqual(initial, 0)

        yield* Reactivity.mutation(["baseline"])(Ref.set(ref, 1))
        yield* Effect.yieldNow()

        const next = yield* mailbox.take
        assert.strictEqual(next, 1)
      })
    )
  })
})
