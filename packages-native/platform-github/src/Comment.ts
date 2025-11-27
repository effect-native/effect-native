/**
 * High-level operations on the triggering comment in GitHub Actions.
 *
 * This module provides a clean, Effect-idiomatic API for working with
 * the comment that triggered an `issue_comment` workflow event.
 *
 * @example
 * ```ts
 * import { Comment } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   // Read comment properties (no parens - they're Effects!)
 *   const body = yield* Comment.body
 *   const author = yield* Comment.author
 *
 *   // Perform actions (with args - they're functions!)
 *   yield* Comment.react("eyes")
 *   yield* Comment.reply("Thanks for your comment!")
 * })
 * ```
 *
 * @since 1.0.0
 */
import type { IssueCommentEvent } from "@octokit/webhooks-types"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"

/**
 * Reaction types supported by GitHub.
 *
 * @since 1.0.0
 * @category models
 */
export type Reaction = "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"

/**
 * Comment service providing operations on the triggering comment.
 *
 * Use this service via its static accessors (when `accessors: true`):
 * - `Comment.id` - Get the comment ID
 * - `Comment.body` - Get the comment body
 * - `Comment.author` - Get the comment author's login
 * - `Comment.react(reaction)` - Add a reaction to the comment
 * - `Comment.reply(body)` - Reply to the issue/PR with a new comment
 *
 * @since 1.0.0
 * @category service
 */
export class Comment extends Effect.Service<Comment>()("@effect-native/platform-github/Comment", {
  accessors: true,
  effect: Effect.gen(function*() {
    const ctx = yield* ActionContext.ActionContext
    const client = yield* ActionClient.ActionClient

    // Validate we're in an issue_comment event
    if (ctx.eventName !== "issue_comment") {
      return yield* Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Comment service requires 'issue_comment' event, got '${ctx.eventName}'`
        })
      )
    }

    const payload = ctx.payload as unknown as IssueCommentEvent

    const owner = payload.repository.owner.login
    const repo = payload.repository.name
    const issueNumber = payload.issue.number
    const commentId = payload.comment.id

    return {
      /**
       * The comment ID.
       */
      id: Effect.succeed(commentId),

      /**
       * The comment body text.
       */
      body: Effect.succeed(payload.comment.body),

      /**
       * The comment author's GitHub login.
       */
      author: Effect.succeed(payload.comment.user.login),

      /**
       * The action that triggered this event: "created", "edited", or "deleted".
       */
      action: Effect.succeed(payload.action),

      /**
       * Add a reaction to the comment.
       */
      react: (reaction: Reaction) =>
        client.request("POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", {
          owner,
          repo,
          comment_id: commentId,
          content: reaction
        }).pipe(Effect.asVoid),

      /**
       * Reply to the issue/PR with a new comment.
       */
      reply: (body: string) =>
        client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner,
          repo,
          issue_number: issueNumber,
          body
        }).pipe(Effect.asVoid),

      /**
       * Update this comment's body.
       */
      update: (body: string) =>
        client.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", {
          owner,
          repo,
          comment_id: commentId,
          body
        }).pipe(Effect.asVoid)
    } as const
  }),
  dependencies: [ActionContext.layer, ActionClient.layer("")]
}) {
  /**
   * Test layer for Comment service.
   *
   * @since 1.0.0
   * @category layers
   */
  static Test = (options: {
    readonly id?: number
    readonly body?: string
    readonly author?: string
    readonly action?: "created" | "edited" | "deleted"
  }) =>
    Layer.succeed(
      Comment,
      new Comment({
        id: Effect.succeed(options.id ?? 1),
        body: Effect.succeed(options.body ?? "test comment"),
        author: Effect.succeed(options.author ?? "testuser"),
        action: Effect.succeed(options.action ?? "created"),
        react: () => Effect.void,
        reply: () => Effect.void,
        update: () => Effect.void
      })
    )
}

// =============================================================================
// Re-export types for convenience
// =============================================================================

/**
 * The action that triggered an issue_comment event.
 *
 * @since 1.0.0
 * @category models
 */
export type CommentAction = "created" | "edited" | "deleted"
