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
//
// These services provide clean, Effect-idiomatic APIs:
//   import { Comment, Issue, PR } from "@effect-native/platform-github"
//   yield* Comment.body      // accessor Effect
//   yield* Comment.react("eyes")  // method
// =============================================================================

/**
 * High-level service for the triggering comment.
 * @since 1.0.0
 */
export { Comment } from "./Comment.js"

/**
 * High-level service for the parent issue.
 * @since 1.0.0
 */
export { Issue } from "./Issue.js"

/**
 * High-level service for pull requests.
 * @since 1.0.0
 */
export { NotPullRequestError, PR } from "./PR.js"

/**
 * Types from the high-level modules.
 * @since 1.0.0
 */
export type { CommentAction, Reaction } from "./Comment.js"
export type { PRCommit, PRFile } from "./PR.js"
