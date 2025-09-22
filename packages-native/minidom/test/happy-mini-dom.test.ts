import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

import * as MiniDom from "@effect-native/minidom"
import * as HappyMiniDom from "@effect-native/minidom/HappyMiniDom"

describe("HappyMiniDom adapter (FR1.7 / FR1.13 / SC7.5 / SC7.10)", () => {
  it.effect("produces a synchronous happy-dom document via make", () =>
    Effect.gen(function*() {
      const service = yield* HappyMiniDom.make()

      expect(MiniDom.SyncCapability.is(service.capabilities.sync)).toBe(true)

      const document = service.document
      const section = yield* document.createElementNS("http://www.w3.org/1999/xhtml", "section")
      const text = yield* document.createTextNode("hello from happy-dom")

      yield* section.append(text)
      const root = document.documentElement
      expect(root?.localName).toBe("html")
      yield* root!.append(section)
      const appended = root!.children.find((child) => child.localName === "section")
      expect(appended?.firstChild?.nodeType).toBe(MiniDom.NodeType.Text)
      expect(appended?.firstChild?.textContent).toBe("hello from happy-dom")
      expect(document.URL.length).toBeGreaterThan(0)
    }))

  it.effect("binds the service via layer helper", () =>
    Effect.gen(function*() {
      const program = Effect.provide(
        Effect.gen(function*() {
          const service = yield* MiniDom.MiniDom.MiniDom
          const article = yield* service.document.createElementNS(
            "http://www.w3.org/1999/xhtml",
            "article"
          )

          const html = service.document.documentElement
          expect(html?.localName).toBe("html")
          yield* html!.append(article)

          return {
            url: service.document.URL,
            hasSync: MiniDom.SyncCapability.is(service.capabilities.sync),
            hasArticle: html!.children.some((child) => child.localName === "article")
          }
        }),
        HappyMiniDom.layer()
      )

      const result = yield* program
      expect(result.url.length).toBeGreaterThan(0)
      expect(result.hasSync).toBe(true)
      expect(result.hasArticle).toBe(true)
    }))
})
