import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"

import { AttributeBag, Composite } from "@effect-native/minidom"

describe("AttributeBag composite refresh (H2/H6)", () => {
  it.effect("refresh bridges local + remote adapters without boundary leaks", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          local: {
            bag: AttributeBag.service({ initial: [[null, "theme", "dark"]] })
          },
          remote: {
            bag: AttributeBag.asyncService({
              loadInitial: () => Effect.sync(() => [[null, "theme", "remote"]] as const)
            })
          }
        },
        resolve: (namespace, name) => (name === "theme" ? "remote" : "local")
      })

      const before = yield* composite.get(null, "theme")
      expect(before).toStrictEqual(Option.some("remote"))

      yield* AttributeBag.refresh(composite)
      const after = yield* composite.get(null, "theme")

      expect(after).toStrictEqual(Option.some("remote"))
    }))

  it.effect("fails writes when guard denies capability", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          local: {
            bag: AttributeBag.service({ initial: [[null, "theme", "dark"]] })
          },
          remote: {
            bag: AttributeBag.asyncService({
              loadInitial: () => Effect.sync(() => [[null, "theme", "remote"]] as const)
            })
          }
        },
        resolve: () => "local",
        guard: () => Effect.fail(new Error("blocked"))
      })

      const attempt = yield* composite.set(null, "theme", "override").pipe(Effect.exit)
      expect(Exit.isFailure(attempt)).toBe(true)
    }))

  it.effect("throws when resolver targets missing adapter", () =>
    Effect.gen(function*() {
      const composite = yield* Composite.makeRouter({
        adapters: {
          local: {
            bag: AttributeBag.service({ initial: [] })
          }
        },
        resolve: () => "remote"
      })

      const exit = yield* composite.get(null, "missing").pipe(Effect.exit)
      expect(Exit.isFailure(exit)).toBe(true)
    }))
})
