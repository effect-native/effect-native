import { describe, expect, it } from "bun:test"
import { spawnSync } from "node:child_process"
import { getLibSqlitePathSync } from "../src/index.js"

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
    const moduleUrl = new URL("../src/index.js", import.meta.url).href
    const script = [
      "Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });",
      "Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });",
      "Object.defineProperty(process, 'report', { value: { getReport: () => ({ header: {}, sharedObjects: ['/lib/libc.musl-x86_64.so.1'] }) }, configurable: true });",
      `import(${
        JSON.stringify(moduleUrl)
      }).then(() => { console.error('expected musl error'); process.exit(1); }).catch((error) => { const message = String(error && typeof error === 'object' && 'message' in error ? error.message : error); if (message.includes('musl')) { process.exit(0); } console.error(message); process.exit(2); });`
    ].join(" ")

    const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" })
    expect(result.status).toBe(0)
  })
})
