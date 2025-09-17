import { describe, expect, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import * as React from "react"
import { RenderTag, layer } from "@effect-native/render"
import { driver } from "@effect-native/render/dom"

describe("DOM driver", () => {
  const domLayer = layer(driver())

  it.effect("renders into the provided container", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const service = yield* RenderTag
        const container = document.createElement("div")
        const root = yield* service.withRoot({ container })

        yield* service.render(root, <span>first</span>)
        expect(container.textContent).toBe("first")

        yield* service.render(root, <span>second</span>)
        expect(container.textContent).toBe("second")
      })
    ).pipe(Effect.provide(domLayer)))

  it.effect("unmounts the React tree when the scope ends", () =>
    Effect.gen(function*() {
      const container = document.createElement("div")

      yield* Effect.scoped(
        Effect.gen(function*() {
          const service = yield* RenderTag
          const root = yield* service.withRoot({ container })
          yield* service.render(root, <span>value</span>)
          expect(container.textContent).toBe("value")
        })
      ).pipe(Effect.provide(domLayer))

      expect(container.textContent).toBe("")
    }))

  it.effect("bridges DOM events through Effect handlers", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const service = yield* RenderTag
        const container = document.createElement("div")
        const root = yield* service.withRoot({ container })
        const count = yield* Ref.make(0)
        const done = yield* Deferred.make<void>()

        const onClick = service.event(() =>
          Effect.gen(function*() {
            yield* Ref.update(count, (n) => n + 1)
            yield* Deferred.succeed(done, undefined)
          })
        )

        yield* service.render(root, <button onClick={onClick}>Click</button>)

        const button = container.querySelector("button")
        expect(button).not.toBeNull()

        yield* Effect.sync(() => {
          React.act(() => {
            button!.click()
          })
        })

        yield* Deferred.await(done)
        const value = yield* Ref.get(count)
        expect(value).toBe(1)
      })
    ).pipe(Effect.provide(domLayer)))
})
