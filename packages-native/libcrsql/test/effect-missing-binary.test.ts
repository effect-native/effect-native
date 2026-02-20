import { describe, expect, it, jest } from "@effect-native/bun-test"
import { Effect } from "effect"

// Mock fs before importing the module under test
jest.mock("node:fs", async () => {
  const actual = await jest.importActual("node:fs")
  return {
    ...actual,
    accessSync: () => {
      throw new Error("ENOENT")
    }
  }
})

describe("effect API missing binary", () => {
  it.effect("fails with ExtensionNotFoundError when binary is missing (fs mocked)", () =>
    Effect.gen(function*() {
      const platform = yield* Effect.promise(() => import("../src/platform.js"))
      const { ExtensionNotFoundError, getCrSqliteExtensionPath } = yield* Effect.promise(() =>
        import("../src/effect.js")
      )
      jest.spyOn(platform, "detectPlatform").mockReturnValue("linux-x86_64")
      const error = yield* getCrSqliteExtensionPath().pipe(Effect.flip)
      expect(error).toBeInstanceOf(ExtensionNotFoundError)
    }))
})
