import { afterEach, beforeAll, describe, expect, test } from "bun:test"
import { GhosttyHarness } from "../src/GhosttyHarness.js"

let harness: GhosttyHarness

beforeAll(async () => {
  harness = await GhosttyHarness.create()
})

afterEach(() => {
  harness.cleanup()
})

describe("GhosttyHarness", () => {
  describe("WASM loading", () => {
    test("creates harness successfully", () => {
      expect(harness).toBeDefined()
    })

    test("creates terminal instance", () => {
      const term = harness.createTerminal(80, 24)
      expect(term).toBeDefined()
      expect(term.cols).toBe(80)
      expect(term.rows).toBe(24)
    })
  })

  describe("terminal operations", () => {
    test("writes plain text", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "Hello, World!")
      expect(harness.screenshot(term)).toBe("Hello, World!")
    })

    test("handles newlines with CRLF", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "Line 1\r\nLine 2\r\nLine 3")
      expect(harness.screenshot(term)).toBe("Line 1\nLine 2\nLine 3")
    })

    test("handles cursor positioning", async () => {
      const term = harness.createTerminal(20, 5)
      // Move to row 3, col 5, write X
      await harness.write(term, "\x1b[3;5HX")

      const cell = harness.getCell(term, 2, 4) // 0-indexed
      expect(cell?.chars).toBe("X")
    })

    test("clears screen", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "Hello")
      await harness.write(term, "\x1b[2J\x1b[H") // Clear and home
      await harness.write(term, "World")
      expect(harness.screenshot(term)).toBe("World")
    })
  })

  describe("ANSI color handling", () => {
    test("different colors have different fgColor values", async () => {
      const term = harness.createTerminal(40, 5)
      // Red=31, Green=32, Blue=34
      await harness.write(term, "\x1b[31mRED\x1b[32mGREEN\x1b[34mBLUE\x1b[0m")

      const redCell = harness.getCell(term, 0, 0)
      const greenCell = harness.getCell(term, 0, 3)
      const blueCell = harness.getCell(term, 0, 8)

      // Each color has a different value (ghostty-web may convert to RGB internally)
      expect(redCell?.fgColor).not.toBe(greenCell?.fgColor)
      expect(greenCell?.fgColor).not.toBe(blueCell?.fgColor)
      expect(redCell?.fgColor).not.toBe(blueCell?.fgColor)
    })

    test("256-color and default have different values", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[38;5;196mRED256\x1b[0m DEFAULT")

      const coloredCell = harness.getCell(term, 0, 0)
      const defaultCell = harness.getCell(term, 0, 7) // 'D' of DEFAULT

      // Colored cell differs from default
      expect(coloredCell?.fgColor).not.toBe(defaultCell?.fgColor)
    })

    test("RGB/truecolor sets distinct foreground color", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[38;2;255;128;64mRGB\x1b[0m DEFAULT")

      const rgbCell = harness.getCell(term, 0, 0)
      const defaultCell = harness.getCell(term, 0, 4)

      // RGB cell differs from default
      expect(rgbCell?.fgColor).not.toBe(defaultCell?.fgColor)
      // The RGB value is 0xFF8040 = 16744512, ghostty-web may use this exact value
      expect(rgbCell?.fgColor).toBe(0xff8040)
    })

    test("background colors are preserved", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[48;2;255;0;0mRED_BG\x1b[0m DEFAULT")

      const bgCell = harness.getCell(term, 0, 0)
      const defaultCell = harness.getCell(term, 0, 7)

      // Background cell differs from default
      expect(bgCell?.bgColor).not.toBe(defaultCell?.bgColor)
      // The RGB value is 0xFF0000 = 16711680
      expect(bgCell?.bgColor).toBe(0xff0000)
    })
  })

  describe("text attributes", () => {
    test("preserves bold", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[1mBOLD\x1b[0m normal")

      const boldCell = harness.getCell(term, 0, 0)
      const normalCell = harness.getCell(term, 0, 5)

      expect(boldCell?.isBold).toBe(true)
      expect(normalCell?.isBold).toBe(false)
    })

    test("preserves italic", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[3mITALIC\x1b[0m normal")

      const italicCell = harness.getCell(term, 0, 0)
      const normalCell = harness.getCell(term, 0, 7)

      expect(italicCell?.isItalic).toBe(true)
      expect(normalCell?.isItalic).toBe(false)
    })

    test("preserves underline", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[4mUNDER\x1b[0m normal")

      const underCell = harness.getCell(term, 0, 0)
      const normalCell = harness.getCell(term, 0, 6)

      expect(underCell?.isUnderline).toBe(true)
      expect(normalCell?.isUnderline).toBe(false)
    })

    test("preserves faint/dim", async () => {
      const term = harness.createTerminal(40, 5)
      await harness.write(term, "\x1b[2mFAINT\x1b[0m normal")

      const faintCell = harness.getCell(term, 0, 0)
      expect(faintCell?.isFaint).toBe(true)
    })

    test("preserves combined attributes", async () => {
      const term = harness.createTerminal(40, 5)
      // Bold + Italic + Underline + Red FG + Yellow BG
      await harness.write(term, "\x1b[1;3;4;31;43mCOMBO\x1b[0m NORMAL")

      const cell = harness.getCell(term, 0, 0)
      const normalCell = harness.getCell(term, 0, 6)
      expect(cell?.isBold).toBe(true)
      expect(cell?.isItalic).toBe(true)
      expect(cell?.isUnderline).toBe(true)
      // Colors are set (different from normal)
      expect(cell?.fgColor).not.toBe(normalCell?.fgColor)
      expect(cell?.bgColor).not.toBe(normalCell?.bgColor)
    })
  })

  describe("box drawing", () => {
    test("renders box drawing characters", async () => {
      const term = harness.createTerminal(40, 10)
      await harness.write(
        term,
        "+---------+\r\n" +
          "| Content |\r\n" +
          "+---------+"
      )

      const screenshot = harness.screenshot(term)
      expect(screenshot).toContain("+---------+")
      expect(screenshot).toContain("| Content |")
    })

    test("renders Unicode box drawing", async () => {
      const term = harness.createTerminal(40, 10)
      await harness.write(
        term,
        "\u250c\u2500\u2500\u2500\u2510\r\n" + // ┌───┐
          "\u2502 X \u2502\r\n" + // │ X │
          "\u2514\u2500\u2500\u2500\u2518" // └───┘
      )

      const screenshot = harness.screenshot(term)
      expect(screenshot).toContain("\u250c\u2500\u2500\u2500\u2510")
      expect(screenshot).toContain("\u2502 X \u2502")
      expect(screenshot).toContain("\u2514\u2500\u2500\u2500\u2518")
    })
  })

  describe("cleanup", () => {
    test("disposes terminals on cleanup", () => {
      const term1 = harness.createTerminal()
      const term2 = harness.createTerminal()

      expect(term1).toBeDefined()
      expect(term2).toBeDefined()

      harness.cleanup()

      // After cleanup, document body is empty
      expect(document.body.innerHTML).toBe("")
    })
  })
})
