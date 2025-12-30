import * as BunTest from "@effect-native/bun-test"
import { describe, expect, test } from "bun:test"
import * as Effect from "effect/Effect"
import { getPlainOutput, sendKey, sendLine, spawnTui, stripAnsi, waitForStable, waitForText } from "../src/Spawn.js"

/**
 * PTY spawn tests require Bun runtime (Bun.spawn with terminal option).
 */
const isBun = typeof process !== "undefined" && "isBun" in process && process.isBun === true

if (!isBun) {
  console.warn(`
╔════════════════════════════════════════════════════════════════════════════╗
║  WARNING: PTY tests require Bun runtime                                    ║
║                                                                            ║
║  The spawnTui function uses Bun.spawn with the 'terminal' option.          ║
║  To run these tests: bun test                                              ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
}

describe.skipIf(!isBun)("spawnTui", () => {
  BunTest.it.scoped("spawns a process and captures output", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["echo", "hello world"])
      const exitCode = yield* handle.exited
      expect(exitCode).toBe(0)

      // Wait for output to be captured
      yield* waitForStable(handle, 50, 1000)

      const output = handle.getOutput()
      expect(output).toContain("hello world")
    }))

  BunTest.it.scoped("can write to stdin", () =>
    Effect.gen(function*() {
      // Use cat which echoes stdin to stdout
      const handle = yield* spawnTui(["cat"])

      // Send some text
      yield* sendLine(handle, "test input")

      // Wait for echo
      yield* waitForText(handle, "test input", 2000)

      // Send Ctrl+D to close stdin
      yield* sendKey(handle, "\x04")

      const exitCode = yield* handle.exited
      expect(exitCode).toBe(0)
    }))

  BunTest.it.scoped("handles terminal dimensions", () =>
    Effect.gen(function*() {
      // tput cols outputs number of columns
      const handle = yield* spawnTui(["bash", "-c", "tput cols"], { cols: 120 })
      const exitCode = yield* handle.exited
      expect(exitCode).toBe(0)

      yield* waitForStable(handle, 50, 1000)

      const output = getPlainOutput(handle).trim()
      expect(output).toContain("120")
    }))

  BunTest.it.scoped("can resize terminal", () =>
    Effect.gen(function*() {
      // Start with default 80 cols
      const handle = yield* spawnTui(["bash"])

      // Check initial size
      yield* sendLine(handle, "tput cols")
      yield* waitForText(handle, "80", 2000)

      // Resize
      handle.resize(100, 30)

      // Check new size
      yield* sendLine(handle, "tput cols")
      yield* waitForText(handle, "100", 2000)

      // Exit bash
      yield* sendLine(handle, "exit")
      const exitCode = yield* handle.exited
      expect(exitCode).toBe(0)
    }))

  BunTest.it.scoped("clears output buffer", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["echo", "first"])
      yield* handle.exited
      yield* waitForStable(handle, 50, 1000)

      expect(handle.getOutput()).toContain("first")

      handle.clearOutput()
      expect(handle.getOutput()).toBe("")
    }))

  BunTest.it.scoped("returns raw output bytes", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["echo", "test"])
      yield* handle.exited
      yield* waitForStable(handle, 50, 1000)

      const raw = handle.getRawOutput()
      expect(raw).toBeInstanceOf(Uint8Array)
      expect(raw.length).toBeGreaterThan(0)

      // Verify it decodes to the expected output
      const decoded = new TextDecoder().decode(raw)
      expect(decoded).toContain("test")
    }))

  BunTest.it.scoped("isClosed returns correct state", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["echo", "done"])

      yield* handle.exited
      yield* waitForStable(handle, 50, 1000)

      // After process exits, PTY may still be technically open briefly
      // but once we close it manually, it is closed
      handle.close()
      expect(handle.isClosed()).toBe(true)
    }))
})

describe.skipIf(!isBun)("waitForText", () => {
  BunTest.it.scoped("resolves when text appears", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["bash", "-c", "sleep 0.1 && echo found"])

      yield* waitForText(handle, "found", 2000)

      // If we get here, waitForText succeeded
      const output = handle.getOutput()
      expect(output).toContain("found")
    }))

  BunTest.it.scoped("times out when text does not appear", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["echo", "something else"])
      yield* handle.exited

      const result = yield* Effect.either(waitForText(handle, "not-here", 100))
      expect(result._tag).toBe("Left")
    }))
})

describe.skipIf(!isBun)("waitForStable", () => {
  BunTest.it.scoped("waits for output to stabilize", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["bash", "-c", "echo one; sleep 0.05; echo two; sleep 0.05; echo three"])

      yield* waitForStable(handle, 100, 2000)

      const output = handle.getOutput()
      expect(output).toContain("one")
      expect(output).toContain("two")
      expect(output).toContain("three")
    }))
})

describe("stripAnsi", () => {
  test("removes color codes", () => {
    const colored = "\x1b[31mred\x1b[0m normal"
    expect(stripAnsi(colored)).toBe("red normal")
  })

  test("removes cursor movement codes", () => {
    const withCursor = "\x1b[2;5Hpositioned\x1b[A\x1b[Bmoved"
    expect(stripAnsi(withCursor)).toBe("positionedmoved")
  })

  test("handles plain text without changes", () => {
    const plain = "hello world"
    expect(stripAnsi(plain)).toBe("hello world")
  })

  test("removes complex SGR sequences", () => {
    const complex = "\x1b[38;2;255;0;0mtrue color\x1b[0m"
    expect(stripAnsi(complex)).toBe("true color")
  })
})

describe.skipIf(!isBun)("sendKey", () => {
  BunTest.it.scoped("sends control characters", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["cat"])

      // Type some text
      handle.write("hello")

      // Send Ctrl+C to interrupt
      yield* sendKey(handle, "\x03")

      // cat may exit with non-zero due to interrupt
      yield* handle.exited
      expect(handle.isClosed()).toBe(true) // Process ended
    }))
})

describe.skipIf(!isBun)("sendLine", () => {
  BunTest.it.scoped("sends text with carriage return", () =>
    Effect.gen(function*() {
      const handle = yield* spawnTui(["cat"])

      yield* sendLine(handle, "line one")
      yield* waitForText(handle, "line one", 2000)

      yield* sendKey(handle, "\x04") // Ctrl+D to end
      yield* handle.exited
    }))
})
