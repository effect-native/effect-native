/**
 * Console layer that uses GitHub Actions workflow commands.
 *
 * This module provides a Console implementation that outputs to GitHub Actions
 * using workflow commands, so that debug/info/warning/error messages appear
 * correctly in the Actions UI.
 *
 * This layer is automatically included when using `Action.runMain`. You can
 * also use it manually if you need finer control over layer composition.
 *
 * @example
 * ```typescript
 * import { Console, Effect } from "effect"
 * import * as Action from "@effect-native/platform-github/Action"
 *
 * const program = Effect.gen(function*() {
 *   yield* Console.info("This appears in GitHub Actions UI")
 *   yield* Console.error("This creates an error annotation")
 *   yield* Console.debug("This only shows if ACTIONS_STEP_DEBUG is enabled")
 * })
 *
 * Action.runMain(program)
 * ```
 *
 * @since 1.0.0
 */
import type * as Layer from "effect/Layer"
import type * as ActionRunner from "./ActionRunner.js"
import * as internal from "./internal/consoleGitHubActions.js"

/**
 * Layer that replaces the default Console with GitHub Actions workflow commands.
 *
 * Console methods map to ActionRunner methods:
 * - `Console.debug()` → `core.debug()` (only visible with ACTIONS_STEP_DEBUG)
 * - `Console.info()` → `core.info()`
 * - `Console.log()` → `core.info()`
 * - `Console.warn()` → `core.warning()` (creates annotation)
 * - `Console.error()` → `core.error()` (creates annotation)
 * - `Console.group()` → `core.startGroup()`
 * - `Console.groupEnd` → `core.endGroup()`
 *
 * Requires ActionRunner to be provided. This is included automatically
 * when using `Action.runMain`.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<never, never, ActionRunner.ActionRunner> = internal.layer
