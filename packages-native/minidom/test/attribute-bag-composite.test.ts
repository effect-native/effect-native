import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import * as MiniDom from "@effect-native/minidom"

describe("AttributeBag composite refresh (H2/H6)", () => {
  it.effect("refresh bridges local + remote adapters without boundary leaks", () =>
    Effect.gen(function*() {
      const composite = yield* MiniDom.Composite.makeRouter({
        adapters: {
          local: {
            bag: MiniDom.AttributeBag.make({ initial: [[null, "theme", "dark"]] })
          },
          remote: {
            bag: MiniDom.AttributeBag.asyncService({
              loadInitial: () => Effect.sync(() => [[null, "theme", "remote"]] as const)
            })
          }
        },
        resolve: (namespace, name) => (name === "theme" ? "remote" : "local")
      })

      const before = yield* composite.get(null, "theme")
      expect(before).toStrictEqual(Option.some("remote"))

      yield* MiniDom.AttributeBag.refresh(composite)
      const after = yield* composite.get(null, "theme")

      expect(after).toStrictEqual(Option.some("remote"))
    }))

  it.effect("fails writes when guard denies capability", () =>
    Effect.gen(function*() {
      const composite = yield* MiniDom.Composite.makeRouter({
        adapters: {
          local: {
            bag: MiniDom.AttributeBag.make({ initial: [[null, "theme", "dark"]] })
          },
          remote: {
            bag: MiniDom.AttributeBag.asyncService({
              loadInitial: () => Effect.sync(() => [[null, "theme", "remote"]] as const)
            })
          }
        },
        resolve: () => "local",
        guard: () => Effect.fail(new MiniDom.MiniDomError.Unsupported({ message: "blocked" }))
      })

      const attempt = yield* composite.set(null, "theme", "override").pipe(Effect.either)
      expect(attempt._tag).toBe("Left")
    }))

  it.effect("throws when resolver targets missing adapter", () =>
    Effect.gen(function*() {
      const composite = yield* MiniDom.Composite.makeRouter({
        adapters: {
          local: {
            bag: MiniDom.AttributeBag.make({ initial: [] })
          }
        },
        resolve: () => "remote"
      })

      const result = yield* composite.get(null, "missing").pipe(Effect.either)
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MiniDom.Composite.CompositeAdapterMissing)
      }
    }))

  it.effect("passes capability metadata to guard", () =>
    Effect.gen(function*() {
      const seen: Array<MiniDom.Composite.GuardContext<string>> = []

      const composite = yield* MiniDom.Composite.makeRouter({
        adapters: {
          local: {
            bag: MiniDom.AttributeBag.make({ initial: [] }),
            capabilities: { sync: true }
          }
        },
        resolve: () => "local",
        guard: (context) =>
          Effect.sync(() => {
            seen.push(context)
          })
      })

      yield* composite.has(null, "theme")

      expect(seen[0]?.capabilities).toEqual({ sync: true })
    }))
})
