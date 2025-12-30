/**
 * Screen assertions and utilities for TUI testing.
 *
 * Provides helpers to verify terminal state, including plain text content,
 * ANSI-escaped content for snapshot testing, and polling utilities.
 *
 * @example
 * ```typescript
 * import { GhosttyHarness, Screen, waitFor } from "@effect-native/tui-testing-library"
 *
 * const harness = await GhosttyHarness.createAsync()
 * const term = harness.createTerminal(80, 24)
 * const screen = Screen.fromTerminal(term)
 *
 * await harness.write(term, "\x1b[32mGreen text\x1b[0m")
 *
 * expect(screen.text()).toBe("Green text")
 * expect(screen.ansi()).toMatchSnapshot()
 *
 * // Wait for content to appear
 * await waitFor(() => screen.text().includes("Loading complete"))
 * ```
 *
 * @since 0.1.0
 */
import type { Terminal } from "ghostty-web"
import type { CellInfo } from "./GhosttyHarness.js"

/**
 * Options for the waitFor polling helper.
 *
 * @since 0.1.0
 */
export interface WaitForOptions {
  /** Maximum time to wait in milliseconds (default: 1000) */
  readonly timeout?: number
  /** Polling interval in milliseconds (default: 50) */
  readonly interval?: number
}

/**
 * Error thrown when waitFor times out.
 *
 * @since 0.1.0
 */
export class WaitForTimeoutError extends Error {
  constructor(timeout: number) {
    super(`waitFor timed out after ${timeout}ms`)
    this.name = "WaitForTimeoutError"
  }
}

/**
 * Polls a predicate until it returns a truthy value or times out.
 *
 * @param predicate - Function that returns a value or Promise. Truthy values resolve.
 * @param options - Timeout and interval configuration
 * @returns The truthy value returned by the predicate
 * @throws WaitForTimeoutError if timeout is reached
 *
 * @example
 * ```typescript
 * // Wait for text to appear
 * await waitFor(() => screen.text().includes("Ready"))
 *
 * // Get a value when it appears
 * const count = await waitFor(() => {
 *   const match = screen.text().match(/Count: (\d+)/)
 *   return match ? parseInt(match[1], 10) : null
 * })
 * ```
 *
 * @since 0.1.0
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  options?: WaitForOptions
): Promise<NonNullable<T>> {
  const timeout = options?.timeout ?? 1000
  const interval = options?.interval ?? 50
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await predicate()
    if (result) {
      return result as NonNullable<T>
    }
    await sleep(interval)
  }

  throw new WaitForTimeoutError(timeout)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Internal buffer interface matching ghostty-web's structure.
 */
interface IBuffer {
  readonly cursorX: number
  readonly cursorY: number
  readonly baseY: number
  readonly length: number
  getLine(y: number): IBufferLine | undefined
  getNullCell(): IBufferCell
}

interface IBufferLine {
  readonly length: number
  readonly isWrapped: boolean
  getCell(x: number): IBufferCell | undefined
  translateToString(trimRight?: boolean, startColumn?: number, endColumn?: number): string
}

interface IBufferCell {
  getChars(): string
  getCode(): number
  getWidth(): number
  getFgColorMode(): number
  getBgColorMode(): number
  getFgColor(): number
  getBgColor(): number
  isBold(): number
  isItalic(): number
  isUnderline(): number
  isStrikethrough(): number
  isBlink(): number
  isInverse(): number
  isInvisible(): number
  isFaint(): number
}

/**
 * Screen provides assertion helpers for terminal content.
 *
 * @example
 * ```typescript
 * const screen = Screen.fromTerminal(term)
 *
 * // Get plain text content
 * expect(screen.text()).toContain("Hello")
 *
 * // Snapshot with ANSI codes preserved
 * expect(screen.ansi()).toMatchSnapshot()
 *
 * // Inspect individual cells
 * const cell = screen.getCell(0, 0)
 * expect(cell?.isBold).toBe(true)
 * ```
 *
 * @since 0.1.0
 */
export class Screen {
  private readonly terminal: Terminal

  private constructor(terminal: Terminal) {
    this.terminal = terminal
  }

  /**
   * Creates a Screen from a Terminal instance.
   *
   * @param terminal - The ghostty-web Terminal instance
   * @returns A Screen for assertions
   *
   * @since 0.1.0
   */
  static fromTerminal(terminal: Terminal): Screen {
    return new Screen(terminal)
  }

  /**
   * Gets the terminal buffer.
   */
  private get buffer(): IBuffer {
    return (this.terminal as any).buffer.active
  }

  /**
   * Returns plain text content of the terminal.
   * Trailing empty lines are trimmed.
   *
   * @returns Multi-line string of terminal content
   *
   * @since 0.1.0
   */
  text(): string {
    const lines: Array<string> = []

    for (let y = 0; y < this.terminal.rows; y++) {
      const line = this.buffer.getLine(y)
      lines.push(line?.translateToString(true) ?? "")
    }

    // Trim trailing empty lines
    while (lines.length && lines[lines.length - 1]!.trim() === "") {
      lines.pop()
    }

    return lines.join("\n")
  }

  /**
   * Returns terminal content with ANSI escape sequences preserved.
   * Useful for snapshot testing with colors and styles.
   *
   * The output can be written back to a terminal to restore the visual state.
   *
   * @returns String with ANSI escape sequences
   *
   * @since 0.1.0
   */
  ansi(): string {
    const buffer = this.buffer
    const nullCell = buffer.getNullCell()
    let currentStyle = nullCell
    const rows: Array<string> = []

    for (let y = 0; y < this.terminal.rows; y++) {
      const line = buffer.getLine(y)
      if (!line) {
        rows.push("")
        continue
      }

      let rowContent = ""
      let nullCellCount = 0

      for (let x = 0; x < line.length; x++) {
        const cell = line.getCell(x)
        if (!cell) continue

        // Skip placeholder cells for wide characters
        if (cell.getWidth() === 0) continue

        const codepoint = cell.getCode()
        const isEmptyCell = codepoint === 0 || cell.getChars() === "" || codepoint >= 0xf000

        // Calculate style changes
        const sgrSeq = this.diffStyle(cell, currentStyle)
        const styleChanged = isEmptyCell ? !equalBg(currentStyle, cell) : sgrSeq.length > 0

        if (styleChanged) {
          // Flush null cells with cursor movement
          if (nullCellCount > 0) {
            rowContent += `\x1b[${nullCellCount}C`
            nullCellCount = 0
          }

          // Apply style change
          if (sgrSeq.length > 0) {
            rowContent += `\x1b[${sgrSeq.join(";")}m`
          }
          currentStyle = cell
        }

        if (isEmptyCell) {
          nullCellCount += cell.getWidth() || 1
        } else {
          // Flush null cells
          if (nullCellCount > 0) {
            rowContent += `\x1b[${nullCellCount}C`
            nullCellCount = 0
          }
          rowContent += cell.getChars()
        }
      }

      rows.push(rowContent)
    }

    // Trim trailing empty rows
    while (rows.length && rows[rows.length - 1] === "") {
      rows.pop()
    }

    // Reset style at end if we changed it
    let result = rows.join("\r\n")
    if (!this.isAttributeDefault(currentStyle)) {
      result += "\x1b[0m"
    }

    return result
  }

  /**
   * Gets information about a specific cell.
   *
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @returns Cell information or undefined if cell doesn't exist
   *
   * @since 0.1.0
   */
  getCell(row: number, col: number): CellInfo | undefined {
    const line = this.buffer.getLine(row)
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
   * Gets the cursor position.
   *
   * @returns Object with row and col (0-based)
   *
   * @since 0.1.0
   */
  getCursor(): { row: number; col: number } {
    return {
      row: this.buffer.cursorY,
      col: this.buffer.cursorX
    }
  }

  /**
   * Calculates SGR sequence to transition from oldCell style to newCell style.
   */
  private diffStyle(cell: IBufferCell, oldCell: IBufferCell): Array<number> {
    const sgrSeq: Array<number> = []
    const fgChanged = !equalFg(cell, oldCell)
    const bgChanged = !equalBg(cell, oldCell)
    const flagsChanged = !equalFlags(cell, oldCell)

    if (!fgChanged && !bgChanged && !flagsChanged) {
      return sgrSeq
    }

    if (this.isAttributeDefault(cell)) {
      if (!this.isAttributeDefault(oldCell)) {
        sgrSeq.push(0)
      }
      return sgrSeq
    }

    // Handle attribute flags
    if (flagsChanged) {
      if (!!cell.isInverse() !== !!oldCell.isInverse()) {
        sgrSeq.push(cell.isInverse() ? 7 : 27)
      }
      if (!!cell.isBold() !== !!oldCell.isBold()) {
        sgrSeq.push(cell.isBold() ? 1 : 22)
      }
      if (!!cell.isUnderline() !== !!oldCell.isUnderline()) {
        sgrSeq.push(cell.isUnderline() ? 4 : 24)
      }
      if (!!cell.isBlink() !== !!oldCell.isBlink()) {
        sgrSeq.push(cell.isBlink() ? 5 : 25)
      }
      if (!!cell.isInvisible() !== !!oldCell.isInvisible()) {
        sgrSeq.push(cell.isInvisible() ? 8 : 28)
      }
      if (!!cell.isItalic() !== !!oldCell.isItalic()) {
        sgrSeq.push(cell.isItalic() ? 3 : 23)
      }
      if (!!cell.isFaint() !== !!oldCell.isFaint()) {
        sgrSeq.push(cell.isFaint() ? 2 : 22)
      }
      if (!!cell.isStrikethrough() !== !!oldCell.isStrikethrough()) {
        sgrSeq.push(cell.isStrikethrough() ? 9 : 29)
      }
    }

    // Handle foreground color
    if (fgChanged) {
      const color = cell.getFgColor()
      const mode = cell.getFgColorMode()
      if (mode === 2 || mode === 3 || mode === -1) {
        // RGB mode
        sgrSeq.push(38, 2, (color >>> 16) & 0xff, (color >>> 8) & 0xff, color & 0xff)
      } else if (mode === 1) {
        // Palette mode
        if (color >= 16) {
          sgrSeq.push(38, 5, color)
        } else {
          sgrSeq.push(color & 8 ? 90 + (color & 7) : 30 + (color & 7))
        }
      } else {
        // Default
        sgrSeq.push(39)
      }
    }

    // Handle background color
    if (bgChanged) {
      const color = cell.getBgColor()
      const mode = cell.getBgColorMode()
      if (mode === 2 || mode === 3 || mode === -1) {
        // RGB mode
        sgrSeq.push(48, 2, (color >>> 16) & 0xff, (color >>> 8) & 0xff, color & 0xff)
      } else if (mode === 1) {
        // Palette mode
        if (color >= 16) {
          sgrSeq.push(48, 5, color)
        } else {
          sgrSeq.push(color & 8 ? 100 + (color & 7) : 40 + (color & 7))
        }
      } else {
        // Default
        sgrSeq.push(49)
      }
    }

    return sgrSeq
  }

  /**
   * Checks if a cell has default attributes (no style).
   */
  private isAttributeDefault(cell: IBufferCell): boolean {
    const mode = cell.getFgColorMode()
    const bgMode = cell.getBgColorMode()

    if (mode !== 0 || bgMode !== 0) {
      return false
    }

    return (
      !cell.isBold() &&
      !cell.isItalic() &&
      !cell.isUnderline() &&
      !cell.isBlink() &&
      !cell.isInverse() &&
      !cell.isInvisible() &&
      !cell.isFaint() &&
      !cell.isStrikethrough()
    )
  }
}

// Helper functions for comparing cell attributes

function equalFg(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return cell1.getFgColorMode() === cell2.getFgColorMode() && cell1.getFgColor() === cell2.getFgColor()
}

function equalBg(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return cell1.getBgColorMode() === cell2.getBgColorMode() && cell1.getBgColor() === cell2.getBgColor()
}

function equalFlags(cell1: IBufferCell, cell2: IBufferCell): boolean {
  return (
    !!cell1.isInverse() === !!cell2.isInverse() &&
    !!cell1.isBold() === !!cell2.isBold() &&
    !!cell1.isUnderline() === !!cell2.isUnderline() &&
    !!cell1.isBlink() === !!cell2.isBlink() &&
    !!cell1.isInvisible() === !!cell2.isInvisible() &&
    !!cell1.isItalic() === !!cell2.isItalic() &&
    !!cell1.isFaint() === !!cell2.isFaint() &&
    !!cell1.isStrikethrough() === !!cell2.isStrikethrough()
  )
}
