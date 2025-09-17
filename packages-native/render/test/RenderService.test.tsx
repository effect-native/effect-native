import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as React from "react"
import type { RenderDriver } from "@effect-native/render"
import { RenderTag, layer } from "@effect-native/render"

describe("Render service", () => {
  interface TestOptions {
    readonly id: string
  }

  interface TestRoot {
    readonly options: TestOptions
    readonly renders: Array<React.ReactElement>
    disposed: boolean
  }

  const makeTestDriver = (): RenderDriver<TestOptions, TestRoot> => ({
    make: (options) =>
      Effect.acquireRelease(
        Effect.sync(() => ({
          options,
          renders: [],
          disposed: false
        } satisfies TestRoot)),
        (root) => Effect.sync(() => {
          root.disposed = true
        })
      ),
    render: (root, element) =>
      Effect.sync(() => {
        root.renders.push(element as React.ReactElement)
      })
  })

  const renderLayer = layer(makeTestDriver())

  it.effect("renders sequential updates without remount", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const service = yield* RenderTag
        const root = yield* service.withRoot({ id: "app" })

        yield* service.render(root, <span>first</span>)
        yield* service.render(root, <span>second</span>)

        expect(root.renders).toHaveLength(2)
        expect(root.renders[0].props.children).toBe("first")
        expect(root.renders[1].props.children).toBe("second")
        expect(root.disposed).toBe(false)
      })
    ).pipe(Effect.provide(renderLayer)))

  it.effect("disposes roots when scope exits", () =>
    Effect.gen(function*() {
      const result = yield* Effect.scoped(
        Effect.gen(function*() {
          const service = yield* RenderTag
          const root = yield* service.withRoot({ id: "scoped" })
          yield* service.render(root, <div />)
          return root
        })
      ).pipe(Effect.provide(renderLayer))

      expect(result.disposed).toBe(true)
    }))
})
