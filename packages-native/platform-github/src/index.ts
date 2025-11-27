/**
 * Effect-based platform package for GitHub Actions development.
 *
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export * as ActionError from "./ActionError.js"

/**
 * @since 1.0.0
 */
export * as ActionRunner from "./ActionRunner.js"

/**
 * @since 1.0.0
 */
export * as ActionRunnerTest from "./ActionRunnerTest.js"

/**
 * @since 1.0.0
 */
export * as ActionContext from "./ActionContext.js"

/**
 * @since 1.0.0
 */
export * as ActionContextTest from "./ActionContextTest.js"

/**
 * @since 1.0.0
 */
export * as ActionClient from "./ActionClient.js"

/**
 * @since 1.0.0
 */
export * as ActionClientTest from "./ActionClientTest.js"

/**
 * @since 1.0.0
 */
export * as ActionSummary from "./ActionSummary.js"

/**
 * @since 1.0.0
 */
export * as ActionSummaryTest from "./ActionSummaryTest.js"

/**
 * @since 1.0.0
 */
export * as Action from "./Action.js"

/**
 * @since 1.0.0
 */
export * as Input from "./Input.js"

/**
 * @since 1.0.0
 */
export * as EventPayload from "./EventPayload.js"

/**
 * @since 1.0.0
 */
export * as ConsoleGitHubActions from "./ConsoleGitHubActions.js"

// =============================================================================
// High-level DX modules (Effect.Service with accessors)
// =============================================================================

/**
 * High-level operations on the triggering comment.
 *
 * @example
 * ```ts
 * import { Comment } from "@effect-native/platform-github"
 *
 * yield* Comment.react("eyes")
 * yield* Comment.reply("Thanks!")
 * ```
 *
 * @since 1.0.0
 */
export * as Comment from "./Comment.js"

/**
 * High-level operations on the parent issue.
 *
 * @example
 * ```ts
 * import { Issue } from "@effect-native/platform-github"
 *
 * const num = yield* Issue.number
 * const isPR = yield* Issue.isPullRequest
 * ```
 *
 * @since 1.0.0
 */
export * as Issue from "./Issue.js"

/**
 * High-level operations on pull requests.
 *
 * Note: All PR accessors auto-fail if not in a PR context (pit of success).
 *
 * @example
 * ```ts
 * import { PR } from "@effect-native/platform-github"
 *
 * const diff = yield* PR.diff
 * const files = yield* PR.files
 * ```
 *
 * @since 1.0.0
 */
export * as PR from "./PR.js"
