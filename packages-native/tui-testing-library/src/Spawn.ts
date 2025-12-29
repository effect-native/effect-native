/**
 * PTY Spawn utilities for TUI testing.
 *
 * Wraps Bun.spawn with PTY (pseudo-terminal) support to capture TUI output
 * and send input for testing terminal applications.
 *
 * @module Spawn
 * @since 0.1.0
 */

import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"

/**
 * Options for spawning a TUI process.
 *
 * @since 0.1.0
 * @category Models
 */
export interface SpawnOptions {
  /** Number of columns for the terminal (default: 80) */
  readonly cols?: number
  /** Number of rows for the terminal (default: 24) */
  readonly rows?: number
  /** Terminal name (default: "xterm-256color") */
  readonly termName?: string
  /** Environment variables */
  readonly env?: Record<string, string>
  /** Working directory */
  readonly cwd?: string
}

/**
 * Handle to a spawned TUI process.
 *
 * @since 0.1.0
 * @category Models
 */
export interface TuiHandle {
  /** Write data to the process stdin via PTY */
  readonly write: (data: string | Uint8Array) => void
  /** Get all accumulated output from the process */
  readonly getOutput: () => string
  /** Get the raw output bytes */
  readonly getRawOutput: () => Uint8Array
  /** Clear the accumulated output buffer */
  readonly clearOutput: () => void
  /** Resize the terminal */
  readonly resize: (cols: number, rows: number) => void
  /** Wait for the process to exit and return exit code */
  readonly exited: Promise<number>
  /** Whether the terminal is closed */
  readonly isClosed: () => boolean
  /** Close the terminal (sends SIGTERM) */
  readonly close: () => void
}

/**
 * Spawn a TUI process with PTY support.
 *
 * Creates a pseudo-terminal and spawns the given command, allowing you to
 * write to its stdin and read from stdout as if it were a real terminal.
 *
 * @example
 * ```typescript
 * import { spawnTui } from "@effect-native/tui-testing-library/Spawn"
 * import * as Effect from "effect/Effect"
 *
 * const program = Effect.gen(function*() {
 *   const handle = yield* spawnTui(["echo", "hello"])
 *   const exitCode = yield* Effect.promise(() => handle.exited)
 *   const output = handle.getOutput()
 *   // output contains "hello\r\n"
 * })
 * ```
 *
 * @since 0.1.0
 * @category Constructors
 */
export const spawnTui = (
  command: ReadonlyArray<string>,
  options?: SpawnOptions
): Effect.Effect<TuiHandle, Error, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const outputChunks: Array<Uint8Array> = []
      let closed = false

      const proc = Bun.spawn(command as Array<string>, {
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : undefined,
        terminal: {
          cols: options?.cols ?? 80,
          rows: options?.rows ?? 24,
          name: options?.termName ?? "xterm-256color",
          data(_terminal, data) {
            outputChunks.push(new Uint8Array(data))
          },
          exit(_terminal, _exitCode, _signal) {
            closed = true
          },
          drain(_terminal) {
            // Ready for more data - nothing to do
          }
        }
      })

      const terminal = proc.terminal

      if (!terminal) {
        throw new Error("Failed to create PTY terminal")
      }

      const handle: TuiHandle = {
        write: (data) => {
          terminal.write(data)
        },

        getOutput: () => {
          const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0)
          const combined = new Uint8Array(totalLength)
          let offset = 0
          for (const chunk of outputChunks) {
            combined.set(chunk, offset)
            offset += chunk.length
          }
          return new TextDecoder().decode(combined)
        },

        getRawOutput: () => {
          const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0)
          const combined = new Uint8Array(totalLength)
          let offset = 0
          for (const chunk of outputChunks) {
            combined.set(chunk, offset)
            offset += chunk.length
          }
          return combined
        },

        clearOutput: () => {
          outputChunks.length = 0
        },

        resize: (cols, rows) => {
          terminal.resize(cols, rows)
        },

        exited: proc.exited,

        isClosed: () => closed || terminal.closed,

        close: () => {
          if (!closed && !terminal.closed) {
            terminal.close()
            closed = true
          }
        }
      }

      return handle
    }),
    (handle) =>
      Effect.sync(() => {
        if (!handle.isClosed()) {
          handle.close()
        }
      })
  )

/**
 * Wait for specific text to appear in the output.
 *
 * @example
 * ```typescript
 * import { spawnTui, waitForText } from "@effect-native/tui-testing-library/Spawn"
 * import * as Effect from "effect/Effect"
 *
 * const program = Effect.gen(function*() {
 *   const handle = yield* spawnTui(["my-tui-app"])
 *   yield* waitForText(handle, "Welcome")
 *   // Now we know the welcome message appeared
 * })
 * ```
 *
 * @since 0.1.0
 * @category Utilities
 */
export const waitForText = (
  handle: TuiHandle,
  needle: string,
  timeoutMs: number = 5000
): Effect.Effect<void, Error> =>
  Effect.async<void, Error>((resume) => {
    const startTime = Date.now()
    const checkInterval = 50

    const check = () => {
      const output = handle.getOutput()
      if (output.includes(needle)) {
        resume(Effect.void)
        return
      }

      if (Date.now() - startTime > timeoutMs) {
        resume(Effect.fail(new Error(`Timeout waiting for text: "${needle}"`)))
        return
      }

      if (handle.isClosed()) {
        resume(Effect.fail(new Error(`Process closed before text appeared: "${needle}"`)))
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })

/**
 * Wait for the output to stabilize (no new output for a period).
 *
 * @since 0.1.0
 * @category Utilities
 */
export const waitForStable = (
  handle: TuiHandle,
  stableMs: number = 100,
  timeoutMs: number = 5000
): Effect.Effect<void, Error> =>
  Effect.async<void, Error>((resume) => {
    const startTime = Date.now()
    const checkInterval = 20
    let lastOutput = handle.getOutput()
    let lastChangeTime = Date.now()

    const check = () => {
      const currentOutput = handle.getOutput()

      if (currentOutput !== lastOutput) {
        lastOutput = currentOutput
        lastChangeTime = Date.now()
      }

      if (Date.now() - lastChangeTime >= stableMs) {
        resume(Effect.void)
        return
      }

      if (Date.now() - startTime > timeoutMs) {
        resume(Effect.fail(new Error("Timeout waiting for output to stabilize")))
        return
      }

      if (handle.isClosed()) {
        // If closed and stable, that's fine
        if (Date.now() - lastChangeTime >= stableMs) {
          resume(Effect.void)
        } else {
          resume(Effect.void) // Process ended, consider it stable
        }
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })

/**
 * Send a key sequence to the TUI.
 *
 * Common key codes:
 * - Enter: "\r" or "\n"
 * - Tab: "\t"
 * - Escape: "\x1b"
 * - Ctrl+C: "\x03"
 * - Ctrl+D: "\x04"
 * - Arrow Up: "\x1b[A"
 * - Arrow Down: "\x1b[B"
 * - Arrow Right: "\x1b[C"
 * - Arrow Left: "\x1b[D"
 *
 * @since 0.1.0
 * @category Utilities
 */
export const sendKey = (handle: TuiHandle, key: string): Effect.Effect<void> =>
  Effect.sync(() => {
    handle.write(key)
  })

/**
 * Send text followed by Enter.
 *
 * @since 0.1.0
 * @category Utilities
 */
export const sendLine = (handle: TuiHandle, text: string): Effect.Effect<void> =>
  Effect.sync(() => {
    handle.write(text + "\r")
  })

/**
 * Strip ANSI escape sequences from a string.
 *
 * @since 0.1.0
 * @category Utilities
 */
export const stripAnsi = (text: string): string => {
  // ESC[ followed by parameters and a letter command
  // Also handles OSC sequences (ESC]) and other escape sequences
  return text.replace(
    // eslint-disable-next-line no-control-regex
    /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][AB012]|\x1b[=>]|\x1b[78]|\x1b[DMEH]/g,
    ""
  )
}

/**
 * Get plain text output (ANSI stripped).
 *
 * @since 0.1.0
 * @category Utilities
 */
export const getPlainOutput = (handle: TuiHandle): string => {
  return stripAnsi(handle.getOutput())
}
