/**
 * Ghostty WASM terminal emulator harness for TUI testing.
 *
 * Provides a high-fidelity virtual terminal for testing TUI applications
 * by capturing their rendered output and asserting on text content, colors, and attributes.
 *
 * @example
 * ```typescript
 * import { describe, test, expect, beforeAll, afterEach } from "bun:test"
 * import { GhosttyHarness } from "@effect-native/tui-testing-library/GhosttyHarness"
 *
 * let harness: GhosttyHarness
 *
 * beforeAll(async () => {
 *   harness = await GhosttyHarness.create()
 * })
 *
 * afterEach(() => {
 *   harness.cleanup()
 * })
 *
 * test("renders menu correctly", async () => {
 *   const term = harness.createTerminal(40, 10)
 *
 *   await harness.write(term, "Hello, \x1b[32mWorld\x1b[0m!")
 *
 *   expect(harness.screenshot(term)).toContain("Hello, World!")
 * })
 * ```
 *
 * @since 0.1.0
 */
import type { Ghostty, Terminal } from "ghostty-web"

/**
 * Cell information from the terminal buffer.
 * Provides access to character content, colors, and text attributes.
 *
 * @since 0.1.0
 */
export interface CellInfo {
  /** Character(s) in the cell */
  readonly chars: string
  /** Unicode codepoint */
  readonly code: number
  /** Cell width (1 or 2 for wide characters) */
  readonly width: number
  /** Foreground color value */
  readonly fgColor: number
  /** Background color value */
  readonly bgColor: number
  /** Foreground color mode: 0=default, 1=palette, 2=RGB */
  readonly fgColorMode: number
  /** Background color mode: 0=default, 1=palette, 2=RGB */
  readonly bgColorMode: number
  /** Whether the cell is bold */
  readonly isBold: boolean
  /** Whether the cell is italic */
  readonly isItalic: boolean
  /** Whether the cell is underlined */
  readonly isUnderline: boolean
  /** Whether the cell has strikethrough */
  readonly isStrikethrough: boolean
  /** Whether the cell is blinking */
  readonly isBlink: boolean
  /** Whether the cell has inverse colors */
  readonly isInverse: boolean
  /** Whether the cell is invisible */
  readonly isInvisible: boolean
  /** Whether the cell is faint/dim */
  readonly isFaint: boolean
}

/**
 * Options for creating a terminal instance.
 *
 * @since 0.1.0
 */
export interface TerminalOptions {
  /** Number of columns (default: 80) */
  readonly cols?: number
  /** Number of rows (default: 24) */
  readonly rows?: number
}

/**
 * Manages Ghostty WASM terminal instances for testing.
 *
 * @since 0.1.0
 */
export class GhosttyHarness {
  private readonly ghostty: Ghostty
  private readonly terminals: Terminal[] = []

  private constructor(ghostty: Ghostty) {
    this.ghostty = ghostty
  }

  /**
   * Creates a new GhosttyHarness by loading the Ghostty WASM module.
   * Call this once per test suite (e.g., in beforeAll).
   *
   * @since 0.1.0
   */
  static async create(): Promise<GhosttyHarness> {
    const { Ghostty } = await import("ghostty-web")
    const ghostty = await Ghostty.load()
    return new GhosttyHarness(ghostty)
  }

  /**
   * Creates a new virtual terminal instance.
   *
   * @param cols - Number of columns (default: 80)
   * @param rows - Number of rows (default: 24)
   * @returns A Terminal instance attached to the DOM
   *
   * @since 0.1.0
   */
  createTerminal(cols = 80, rows = 24): Terminal {
    // @ts-expect-error - dynamic import type
    const { Terminal } = require("ghostty-web")

    const container = document.createElement("div")
    document.body.appendChild(container)

    const term = new Terminal({ cols, rows, ghostty: this.ghostty })
    term.open(container)
    this.terminals.push(term)

    return term
  }

  /**
   * Writes data to the terminal and waits for it to be processed.
   *
   * @param term - The terminal instance
   * @param data - String or Uint8Array data to write
   * @returns Promise that resolves when the write is complete
   *
   * @since 0.1.0
   */
  write(term: Terminal, data: string | Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      term.write(data, resolve)
    })
  }

  /**
   * Captures the terminal content as a 2D text grid.
   * Trailing empty lines are trimmed.
   *
   * @param term - The terminal instance
   * @returns The terminal content as a multi-line string
   *
   * @since 0.1.0
   */
  screenshot(term: Terminal): string {
    const lines: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = (term as any).buffer.active

    for (let y = 0; y < term.rows; y++) {
      const line = buffer.getLine(y)
      lines.push(line?.translateToString(true) ?? "")
    }

    // Trim trailing empty lines
    while (lines.length && lines[lines.length - 1]!.trim() === "") {
      lines.pop()
    }

    return lines.join("\n")
  }

  /**
   * Gets information about a specific cell in the terminal buffer.
   *
   * @param term - The terminal instance
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @returns Cell information or undefined if the cell doesn't exist
   *
   * @since 0.1.0
   */
  getCell(term: Terminal, row: number, col: number): CellInfo | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = (term as any).buffer.active
    const line = buffer.getLine(row)
    const cell = line?.getCell(col)

    if (!cell) {
      return undefined
    }

    return {
      chars: cell.getChars(),
      code: cell.getCode(),
      width: cell.getWidth(),
      fgColor: cell.getFgColor(),
      bgColor: cell.getBgColor(),
      fgColorMode: cell.getFgColorMode(),
      bgColorMode: cell.getBgColorMode(),
      isBold: cell.isBold() === 1,
      isItalic: cell.isItalic() === 1,
      isUnderline: cell.isUnderline() === 1,
      isStrikethrough: cell.isStrikethrough() === 1,
      isBlink: cell.isBlink() === 1,
      isInverse: cell.isInverse() === 1,
      isInvisible: cell.isInvisible() === 1,
      isFaint: cell.isFaint() === 1
    }
  }

  /**
   * Gets the raw cell object for advanced inspection.
   * Use getCell() for a typed interface.
   *
   * @param term - The terminal instance
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @returns The raw cell object or undefined
   *
   * @since 0.1.0
   */
  getRawCell(term: Terminal, row: number, col: number): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = (term as any).buffer.active
    const line = buffer.getLine(row)
    return line?.getCell(col)
  }

  /**
   * Disposes all terminal instances and cleans up the DOM.
   * Call this in afterEach to prevent memory leaks.
   *
   * @since 0.1.0
   */
  cleanup(): void {
    for (const term of this.terminals) {
      term.dispose()
    }
    this.terminals.length = 0
    document.body.innerHTML = ""
  }

  /**
   * Disposes the harness and all terminals.
   * Call this in afterAll if you want to fully clean up.
   *
   * @since 0.1.0
   */
  dispose(): void {
    this.cleanup()
  }
}
