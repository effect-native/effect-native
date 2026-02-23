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
import type * as Scope from "effect/Scope"

/**
 * Diagnostic information for PTY spawn failures.
 *
 * @since 0.1.0
 * @category Models
 */
export interface PtyDiagnostics {
  readonly runtime: {
    readonly isBun: boolean
    readonly bunVersion: string | undefined
    readonly nodeVersion: string | undefined
    readonly bunGlobalExists: boolean
  }
  readonly tty: {
    readonly stdin: boolean
    readonly stdout: boolean
    readonly stderr: boolean
  }
}

/**
 * Collect diagnostic information about the current runtime and TTY state.
 *
 * @since 0.1.0
 * @category Utilities
 */
export const getPtyDiagnostics = (): PtyDiagnostics => ({
  runtime: {
    isBun: typeof process !== "undefined" && "isBun" in process && process.isBun === true,
    bunVersion: typeof process !== "undefined" && "versions" in process
      ? (process.versions as Record<string, string>).bun
      : undefined,
    nodeVersion: typeof process !== "undefined" && "versions" in process
      ? (process.versions as Record<string, string>).node
      : undefined,
    bunGlobalExists: typeof Bun !== "undefined"
  },
  tty: {
    stdin: typeof process !== "undefined" && process.stdin?.isTTY === true,
    stdout: typeof process !== "undefined" && process.stdout?.isTTY === true,
    stderr: typeof process !== "undefined" && process.stderr?.isTTY === true
  }
})

/**
 * Format diagnostics for error messages.
 *
 * @since 0.1.0
 * @category Utilities
 */
export const formatPtyDiagnostics = (diag: PtyDiagnostics): string => {
  const runtime = diag.runtime.isBun
    ? `bun ${diag.runtime.bunVersion ?? "unknown"}`
    : `node ${diag.runtime.nodeVersion ?? "unknown"}`
  return [
    `Runtime: ${runtime} | process.isBun: ${diag.runtime.isBun} | Bun global: ${diag.runtime.bunGlobalExists}`,
    `TTY: stdin=${diag.tty.stdin}, stdout=${diag.tty.stdout}, stderr=${diag.tty.stderr}`
  ].join("\n")
}

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
  readonly exited: Effect.Effect<number>
  /** Wait for the process to exit and return exit code */
  readonly exitedAsync: Promise<number>
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
      const diag = getPtyDiagnostics()

      // Check if Bun runtime is available
      if (!diag.runtime.bunGlobalExists) {
        throw new Error(
          `PTY spawn requires Bun runtime, but Bun global is not available.\n${formatPtyDiagnostics(diag)}`
        )
      }

      const outputChunks: Array<Uint8Array> = []
      let closed = false

      let proc: ReturnType<typeof Bun.spawn>
      try {
        proc = Bun.spawn(command as Array<string>, {
          ...(options?.cwd !== undefined && { cwd: options.cwd }),
          env: {
            ...process.env,
            TERM: options?.termName ?? "xterm-256color",
            ...(options?.env !== undefined && options.env)
          },
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
      } catch (spawnError) {
        const err = spawnError as Error & { code?: string; errno?: number; syscall?: string }
        throw new Error(
          [
            `Failed to spawn PTY process: ${err.message}`,
            formatPtyDiagnostics(diag),
            `Error code: ${err.code ?? "none"} | Errno: ${err.errno ?? "none"} | Syscall: ${err.syscall ?? "none"}`,
            `Stack: ${err.stack ?? "none"}`
          ].join("\n"),
          { cause: spawnError }
        )
      }

      const terminal = proc.terminal

      if (!terminal) {
        throw new Error(
          [
            "Failed to create PTY terminal (proc.terminal is null/undefined)",
            formatPtyDiagnostics(diag),
            "This typically means the OS denied PTY allocation.",
            "Common causes: running without a controlling terminal, resource limits, or permission issues."
          ].join("\n")
        )
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

        exited: Effect.promise(() => proc.exited),
        exitedAsync: proc.exited,

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
        if (handle.isClosed()) return
        handle.close()
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
  Effect.callback<void, Error>((resume) => {
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
  Effect.callback<void, Error>((resume) => {
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
