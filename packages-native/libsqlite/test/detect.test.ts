import { describe, expect, it } from "bun:test"
import { getLibSqlitePathSync } from "../src/index"

describe("platform detection", () => {
  it("returns darwin-x86_64 path for darwin/x64 platform", () => {
    const p = getLibSqlitePathSync("darwin-x86_64")
    expect(p.endsWith("darwin-x86_64/libsqlite3.dylib")).toBe(true)
  })

  it("returns linux-x86_64 path for linux/x64 glibc platform", () => {
    const p = getLibSqlitePathSync("linux-x86_64")
    expect(p.endsWith("linux-x86_64/libsqlite3.so")).toBe(true)
  })

  it("throws on linux musl", () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
    const originalArch = Object.getOwnPropertyDescriptor(process, "arch")
    const originalReport = Object.getOwnPropertyDescriptor(process, "report")
    // Remove the cached module so require() re-evaluates it with mocked process
    const cacheKey = Object.keys(require.cache).find((k) => k.includes("libsqlite/src/index"))
    try {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true })
      Object.defineProperty(process, "arch", { value: "x64", configurable: true })
      Object.defineProperty(process, "report", {
        value: {
          getReport: () => JSON.stringify({ header: {}, sharedObjects: ["/lib/libc.musl-x86_64.so.1"] })
        },
        configurable: true
      })
      if (cacheKey) delete require.cache[cacheKey]
      expect(() => require("../src/index")).toThrow("musl")
    } finally {
      if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
      if (originalArch) Object.defineProperty(process, "arch", originalArch)
      if (originalReport) Object.defineProperty(process, "report", originalReport)
      // Re-populate the cache with the real module
      if (cacheKey) {
        delete require.cache[cacheKey]
        require("../src/index")
      }
    }
  })
})
