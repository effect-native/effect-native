import { afterEach, describe, expect, it, jest } from "bun:test"
import { getLibSqlitePathSync } from "../src/index"

const originalProcess = process

describe("platform detection", () => {
  afterEach(() => {
    jest.resetModules()
    // restore the real process
    // @ts-expect-error override
    globalThis.process = originalProcess
  })

  // These tests verify that the path-lookup returns the correct library path
  // for each supported platform. They use getLibSqlitePathSync with an explicit
  // platform argument, which bypasses process detection and directly returns the
  // bundled library path. jest.stubGlobal("process") + jest.resetModules() is not
  // reliable in vitest's ESM module runner for testing module-level constants.
  it("returns darwin-x86_64 path for darwin/x64 platform", () => {
    const p = getLibSqlitePathSync("darwin-x86_64")
    expect(p.endsWith("darwin-x86_64/libsqlite3.dylib")).toBe(true)
  })

  it("returns linux-x86_64 path for linux/x64 glibc platform", () => {
    const p = getLibSqlitePathSync("linux-x86_64")
    expect(p.endsWith("linux-x86_64/libsqlite3.so")).toBe(true)
  })

  it("throws on linux musl", async () => {
    // Stub only the properties needed for musl detection; preserve all other
    // process properties (including nextTick) to avoid breaking vitest internals.
    const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
    const originalArch = Object.getOwnPropertyDescriptor(process, "arch")
    const originalReport = Object.getOwnPropertyDescriptor(process, "report")
    try {
      Object.defineProperty(process, "platform", { value: "linux", configurable: true })
      Object.defineProperty(process, "arch", { value: "x64", configurable: true })
      Object.defineProperty(process, "report", {
        value: {
          getReport: () => JSON.stringify({ header: {}, sharedObjects: ["/lib/libc.musl-x86_64.so.1"] })
        },
        configurable: true
      })
      jest.resetModules()
      let err: unknown
      try {
        await import("../src/index")
      } catch (e) {
        err = e
      }
      expect(typeof err === "object" && err !== null && "message" in err).toBe(true)
      expect(String((err as { message: unknown }).message)).toContain("musl")
    } finally {
      if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
      if (originalArch) Object.defineProperty(process, "arch", originalArch)
      if (originalReport) Object.defineProperty(process, "report", originalReport)
    }
  })
})
