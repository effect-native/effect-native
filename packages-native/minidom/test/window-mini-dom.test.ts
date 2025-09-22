import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { Window as HappyWindow } from "happy-dom"

import * as MiniDom from "@effect-native/minidom"
import * as WindowMiniDom from "@effect-native/minidom/WindowMiniDom"

describe("WindowMiniDom adapter (FR1.8 / FR1.13 / SC7.5)", () => {
  it.effect("wraps the provided window", () =>
    Effect.gen(function*() {
      const window = new HappyWindow()
      const service = yield* WindowMiniDom.make({ window: window as unknown as Window })

      expect(service.window).toBe(window)
      expect(MiniDom.SyncCapability.is(service.capabilities.sync)).toBe(true)

      const document = service.document
      const div = yield* document.createElementNS("http://www.w3.org/1999/xhtml", "div")
      const html = document.documentElement
      expect(html?.localName).toBe("html")
      yield* html!.append(div)

      const inserted = html!.children.some((child) => child.localName === "div")
      expect(inserted).toBe(true)
    }))

  it.effect("exposes a layer helper bound to the supplied window", () =>
    Effect.gen(function*() {
      const window = new HappyWindow()

      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* MiniDom.MiniDom.MiniDom

          return {
            sameWindow: service.window === window as unknown,
            hasSync: MiniDom.SyncCapability.is(service.capabilities.sync)
          }
        }),
        WindowMiniDom.layer({ window: window as unknown as Window })
      )

      const result = yield* program
      expect(result.sameWindow).toBe(true)
      expect(result.hasSync).toBe(true)
    }))
})
