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
// Import the class directly for cleaner usage:
//   import { Comment, Issue, PR } from "@effect-native/platform-github"
//   yield* Comment.Comment.body  // with namespace
//
// Or use subpath imports:
//   import { Comment } from "@effect-native/platform-github/Comment"
//   yield* Comment.body  // direct accessor!
// =============================================================================

/**
 * @since 1.0.0
 */
export * as Comment from "./Comment.js"

/**
 * @since 1.0.0
 */
export * as Issue from "./Issue.js"

/**
 * @since 1.0.0
 */
export * as PR from "./PR.js"

