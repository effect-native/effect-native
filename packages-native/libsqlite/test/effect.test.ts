import { it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { isSupportedPlatform } from "./test-utils"

const testIt = isSupportedPlatform ? it.effect : it.skip
testIt("getLibSqlitePath yields a string", () =>
  Effect.gen(function*() {
    const mod = yield* Effect.promise(() => import("@effect-native/libsqlite/effect"))
    const p = yield* mod.getLibSqlitePath
    // we don't assert filesystem existence here; packaging assembles binaries in release
    yield* Effect.sync(() => {
      if (typeof p !== "string" || p.length === 0) {
        throw new Error("expected a non-empty string path")
      }
    })
  }))
