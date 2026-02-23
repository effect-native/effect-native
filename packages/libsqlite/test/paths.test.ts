import { describe, expect, it } from "bun:test"
import { getLibSqlitePathSync } from "../src/index.js"

describe("platform-specific paths", () => {
  it("darwin-x86_64 ends with .dylib", () => {
    const p = getLibSqlitePathSync("darwin-x86_64")
    expect(p.endsWith("libsqlite3.dylib")).toBe(true)
  })

  it("linux-x86_64 ends with .so", () => {
    const p = getLibSqlitePathSync("linux-x86_64")
    expect(p.endsWith("libsqlite3.so")).toBe(true)
  })
})
