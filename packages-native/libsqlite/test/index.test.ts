import { describe, expect, it } from "vitest"
import { isSupportedPlatform } from "./test-utils"

describe.skipIf(!isSupportedPlatform)("libsqlite root api", () => {
  it("exports a string path", async () => {
    const { pathToLibSqlite } = await import("@effect-native/libsqlite")
    expect(typeof pathToLibSqlite).toBe("string")
    expect(pathToLibSqlite.length).toBeGreaterThan(0)
  })

  it("getLibSqlitePathSync returns a string path", async () => {
    const { getLibSqlitePathSync } = await import("@effect-native/libsqlite")
    const p = getLibSqlitePathSync(undefined)
    expect(typeof p).toBe("string")
    expect(p.includes("libsqlite3")).toBe(true)
  })
})
