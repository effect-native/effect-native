import { describe, expect, it } from "vitest"
import { isSupportedPlatform } from "./test-utils"

describe.skipIf(!isSupportedPlatform)("platform-specific paths", () => {
  it("darwin-x86_64 ends with .dylib", async () => {
    const { getLibSqlitePathSync } = await import("../src/index")
    const p = getLibSqlitePathSync("darwin-x86_64")
    expect(p.endsWith("libsqlite3.dylib")).toBe(true)
  })

  it("linux-x86_64 ends with .so", async () => {
    const { getLibSqlitePathSync } = await import("../src/index")
    const p = getLibSqlitePathSync("linux-x86_64")
    expect(p.endsWith("libsqlite3.so")).toBe(true)
  })
})
