/**
 * Console implementation that uses ActionRunner for GitHub Actions output.
 *
 * @since 1.0.0
 * @internal
 */
import type * as Console from "effect/Console"
import * as ConsoleModule from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as ActionRunnerApi from "../ActionRunner.js"
import * as ActionRunner from "./actionRunner.js"

/**
 * Format arguments for GitHub Actions (single string required).
 * @internal
 */
const formatArgs = (args: ReadonlyArray<unknown>): string =>
  args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")

/**
 * Create a Console implementation that delegates to ActionRunner.
 * @internal
 */
const make = Effect.map(ActionRunner.ActionRunner, (runner): Console.Console => ({
  [ConsoleModule.TypeId]: ConsoleModule.TypeId,

  assert: (condition, ...args) => condition ? Effect.void : runner.warning(`Assertion failed: ${formatArgs(args)}`),

  clear: Effect.void, // No-op in GitHub Actions

  count: () => Effect.void, // No meaningful mapping

  countReset: () => Effect.void,

  debug: (...args) => runner.debug(formatArgs(args)),

  dir: (item, _options) => runner.info(JSON.stringify(item, null, 2)),

  dirxml: (...args) => runner.info(formatArgs(args)),

  error: (...args) => runner.error(formatArgs(args)),

  group: (options) => runner.startGroup(options?.label ?? "group"),

  groupEnd: runner.endGroup(),

  info: (...args) => runner.info(formatArgs(args)),

  log: (...args) => runner.info(formatArgs(args)),

  table: (data, _props) => runner.info(JSON.stringify(data, null, 2)),

  time: () => Effect.void, // Could implement with Effect.currentTimeMillis

  timeEnd: () => Effect.void,

  timeLog: () => Effect.void,

  trace: (...args) => runner.debug(`[trace] ${formatArgs(args)}`),

  warn: (...args) => runner.warning(formatArgs(args)),

  // Unsafe console for synchronous access (falls back to global console)
  unsafe: globalThis.console
}))

/**
 * Layer that replaces the default Console with GitHub Actions output.
 * Requires ActionRunner to be provided.
 * @internal
 */
export const layer: Layer.Layer<never, never, ActionRunnerApi.ActionRunner> = Layer.unwrapEffect(
  Effect.map(make, ConsoleModule.setConsole)
)
