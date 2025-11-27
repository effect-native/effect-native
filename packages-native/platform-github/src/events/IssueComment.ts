/**
 * IssueCommentContext service for GitHub Actions triggered by issue_comment events.
 *
 * Provides type-safe access to the issue_comment webhook payload and
 * convenience methods for common operations like adding reactions and replies.
 *
 * The layer validates that the current event is `issue_comment` at construction
 * time, failing with an ActionContextError if the event type doesn't match.
 *
 * @example
 * ```typescript
 * import { Action } from "@effect-native/platform-github"
 * import { IssueComment } from "@effect-native/platform-github/events"
 * import { Console, Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const ctx = yield* IssueComment.IssueCommentContext
 *
 *   // Check if this is a PR comment (not a regular issue comment)
 *   if (!ctx.isPullRequest) {
 *     yield* Console.info("Not a PR comment, skipping")
 *     return
 *   }
 *
 *   // React to acknowledge
 *   yield* ctx.addReaction("eyes")
 *
 *   // Process and reply
 *   yield* ctx.reply("Thanks for your comment!")
 * })
 *
 * Action.runMain(
 *   program.pipe(Effect.provide(IssueComment.layer))
 * )
 * ```
 *
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type * as Layer from "effect/Layer"
import type * as ActionClient from "../ActionClient.js"
import type * as ActionContext from "../ActionContext.js"
import type { ActionContextError } from "../ActionError.js"
import * as internal from "./internal/issueComment.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: internal.TypeId = internal.TypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = internal.TypeId

/**
 * Reaction types supported by GitHub.
 *
 * @since 1.0.0
 * @category models
 */
export type Reaction = internal.Reaction

/**
 * IssueCommentContext service interface.
 *
 * Provides typed access to issue_comment event data and convenience methods.
 *
 * @since 1.0.0
 * @category models
 */
export type IssueCommentContext = internal.IssueCommentContext

/**
 * IssueCommentContext service tag.
 *
 * @since 1.0.0
 * @category context
 */
export const IssueCommentContext: Tag<IssueCommentContext, IssueCommentContext> = internal.IssueCommentContext

/**
 * Layer that provides IssueCommentContext.
 *
 * Validates that the current event is `issue_comment` at construction time.
 * Requires ActionContext and ActionClient to be provided.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<
  IssueCommentContext,
  ActionContextError,
  ActionContext.ActionContext | ActionClient.ActionClient
> = internal.layer

// Note: IssueCommentEvent type is available from @octokit/webhooks-types
// Import it directly: import type { IssueCommentEvent } from "@octokit/webhooks-types"
