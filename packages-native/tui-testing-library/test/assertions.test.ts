import { afterEach, beforeAll, describe, expect, test } from "bun:test"
import { GhosttyHarness } from "../src/GhosttyHarness.js"
import { Screen, waitFor, WaitForTimeoutError } from "../src/assertions.js"

let harness: GhosttyHarness

beforeAll(async () => {
  harness = await GhosttyHarness.create()
})

afterEach(() => {
  harness.cleanup()
})

/** Write with screen clear to ensure fresh terminal state */
async function freshWrite(term: ReturnType<typeof harness.createTerminal>, data: string) {
  // Clear screen and home cursor first
  await harness.writeAsync(term, "\x1b[2J\x1b[H")
  await harness.writeAsync(term, data)
}

describe("Screen", () => {
  describe("text()", () => {
    test("returns plain text content", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "Hello, World!")

      const screen = Screen.fromTerminal(term)
      expect(screen.text()).toBe("Hello, World!")
    })

    test("strips ANSI escape sequences", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "\x1b[32mGreen\x1b[0m text")

      const screen = Screen.fromTerminal(term)
      expect(screen.text()).toBe("Green text")
    })

    test("handles multiline content", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "Line 1\r\nLine 2\r\nLine 3")

      const screen = Screen.fromTerminal(term)
      expect(screen.text()).toBe("Line 1\nLine 2\nLine 3")
    })

    test("trims trailing empty lines", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "Content")

      const screen = Screen.fromTerminal(term)
      // Only 1 line, not 5
      expect(screen.text()).toBe("Content")
      expect(screen.text().split("\n").length).toBe(1)
    })
  })

  describe("ansi()", () => {
    test("preserves foreground color codes", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "\x1b[31mRed\x1b[0m")

      const screen = Screen.fromTerminal(term)
      const ansi = screen.ansi()

      // Contains style codes and text
      expect(ansi).toContain("Red")
      // Contains some escape sequence
      expect(ansi).toContain("\x1b[")
    })

    test("preserves RGB colors", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "\x1b[38;2;255;128;64mOrange\x1b[0m")

      const screen = Screen.fromTerminal(term)
      const ansi = screen.ansi()

      expect(ansi).toContain("Orange")
      // RGB color preserved
      expect(ansi).toContain("38;2;255;128;64")
    })

    test("preserves bold attribute", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "\x1b[1mBold\x1b[0m")

      const screen = Screen.fromTerminal(term)
      const ansi = screen.ansi()

      expect(ansi).toContain("Bold")
      // Bold code (1)
      expect(ansi).toMatch(/\x1b\[\d*1/)
    })

    test("preserves combined styles", async () => {
      const term = harness.createTerminal(40, 5)
      // Bold + Italic + Red
      await freshWrite(term, "\x1b[1;3;31mStyled\x1b[0m")

      const screen = Screen.fromTerminal(term)
      const ansi = screen.ansi()

      expect(ansi).toContain("Styled")
    })

    test("roundtrip: ansi output renders same text", async () => {
      const term1 = harness.createTerminal(40, 5)
      await freshWrite(term1, "\x1b[32mGreen\x1b[0m Normal")

      const screen1 = Screen.fromTerminal(term1)
      const ansi = screen1.ansi()

      // Write the ANSI output to a new terminal
      const term2 = harness.createTerminal(40, 5)
      await freshWrite(term2, ansi)

      const screen2 = Screen.fromTerminal(term2)

      // Plain text matches
      expect(screen2.text()).toBe(screen1.text())
    })
  })

  describe("getCell()", () => {
    test("returns cell information", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "A")

      const screen = Screen.fromTerminal(term)
      const cell = screen.getCell(0, 0)

      expect(cell).toBeDefined()
      expect(cell?.chars).toBe("A")
    })

    test("returns undefined for out of bounds", async () => {
      const term = harness.createTerminal(40, 5)

      const screen = Screen.fromTerminal(term)
      const cell = screen.getCell(100, 100)

      expect(cell).toBeUndefined()
    })

    test("returns cell attributes", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "\x1b[1mB\x1b[0m")

      const screen = Screen.fromTerminal(term)
      const cell = screen.getCell(0, 0)

      expect(cell?.isBold).toBe(true)
    })
  })

  describe("getCursor()", () => {
    test("returns cursor position", async () => {
      const term = harness.createTerminal(40, 5)
      await freshWrite(term, "ABC")

      const screen = Screen.fromTerminal(term)
      const cursor = screen.getCursor()

      expect(cursor.row).toBe(0)
      expect(cursor.col).toBe(3)
    })

    test("tracks cursor after positioning", async () => {
      const term = harness.createTerminal(40, 5)
      // Move cursor to row 3, col 10
      await freshWrite(term, "\x1b[3;10H")

      const screen = Screen.fromTerminal(term)
      const cursor = screen.getCursor()

      // 0-indexed
      expect(cursor.row).toBe(2)
      expect(cursor.col).toBe(9)
    })
  })
})

describe("waitFor", () => {
  test("resolves immediately when predicate is truthy", async () => {
    const result = await waitFor(() => "value")
    expect(result).toBe("value")
  })

  test("resolves when predicate becomes truthy", async () => {
    let count = 0
    const result = await waitFor(() => {
      count++
      return count >= 3 ? count : null
    })
    expect(result).toBe(3)
  })

  test("works with async predicates", async () => {
    const result = await waitFor(async () => {
      await sleep(10)
      return "async value"
    })
    expect(result).toBe("async value")
  })

  test("throws WaitForTimeoutError on timeout", async () => {
    let thrown = false
    try {
      await waitFor(() => false, { timeout: 100 })
    } catch (e) {
      thrown = true
      expect(e).toBeInstanceOf(WaitForTimeoutError)
      expect((e as Error).message).toContain("100ms")
    }
    expect(thrown).toBe(true)
  })

  test("respects custom timeout", async () => {
    const start = Date.now()
    try {
      await waitFor(() => false, { timeout: 50 })
    } catch {
      // Expected
    }
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(50)
    expect(elapsed).toBeLessThan(200)
  })

  test("respects custom interval", async () => {
    let callCount = 0
    try {
      await waitFor(
        () => {
          callCount++
          return false
        },
        { timeout: 100, interval: 25 }
      )
    } catch {
      // Expected
    }
    // With 100ms timeout and 25ms interval, expect ~4 calls
    expect(callCount).toBeGreaterThanOrEqual(3)
    expect(callCount).toBeLessThanOrEqual(6)
  })

  test("works with terminal content polling", async () => {
    const term = harness.createTerminal(40, 5)
    // Clear the terminal first
    await harness.writeAsync(term, "\x1b[2J\x1b[H")
    const screen = Screen.fromTerminal(term)

    // Start writing after a delay
    setTimeout(async () => {
      await harness.writeAsync(term, "Ready!")
    }, 50)

    await waitFor(() => screen.text().includes("Ready"), { timeout: 500 })
    expect(screen.text()).toBe("Ready!")
  })
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
