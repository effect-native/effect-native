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
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"
import { getCommentPayload } from "./internal/payload.js"

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

    const data = getCommentPayload(ctx)
    if (!data) {
      return yield* Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Comment service requires 'issue_comment' event, got '${ctx.eventName}'`
        })
      )
    }

    const { owner, repo, issueNumber, comment, action } = data

    return {
      /** The comment ID. */
      id: Effect.sync(() => comment.id),

      /** The comment body text. */
      body: Effect.sync(() => comment.body),

      /** The comment author's GitHub login. */
      author: Effect.sync(() => comment.user.login),

      /** The action that triggered this event: "created", "edited", or "deleted". */
      action: Effect.sync(() => action),

      /** The URL to this comment on GitHub. */
      htmlUrl: Effect.sync(() => comment.html_url),

      /** When the comment was created (ISO 8601). */
      createdAt: Effect.sync(() => comment.created_at),

      /** When the comment was last updated (ISO 8601). */
      updatedAt: Effect.sync(() => comment.updated_at),

      /** Add a reaction to the comment. */
      react: (reaction: Reaction) =>
        client.request("POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", {
          owner,
          repo,
          comment_id: comment.id,
          content: reaction
        }).pipe(Effect.asVoid),

      /** Reply to the issue/PR with a new comment. */
      reply: (body: string) =>
        client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner,
          repo,
          issue_number: issueNumber,
          body
        }).pipe(Effect.asVoid),

      /** Update this comment's body. */
      update: (body: string) =>
        client.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", {
          owner,
          repo,
          comment_id: comment.id,
          body
        }).pipe(Effect.asVoid),

      /** Delete this comment. */
      delete: client.request("DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}", {
        owner,
        repo,
        comment_id: comment.id
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
    readonly id: number
    readonly body: string
    readonly author: string
    readonly action: "created" | "edited" | "deleted"
    readonly htmlUrl?: string
    readonly createdAt?: string
    readonly updatedAt?: string
  }) =>
    Layer.succeed(
      Comment,
      new Comment({
        id: Effect.sync(() => options.id),
        body: Effect.sync(() => options.body),
        author: Effect.sync(() => options.author),
        action: Effect.sync(() => options.action),
        htmlUrl: Effect.sync(() => options.htmlUrl ?? ""),
        createdAt: Effect.sync(() => options.createdAt ?? new Date().toISOString()),
        updatedAt: Effect.sync(() => options.updatedAt ?? new Date().toISOString()),
        react: () => Effect.void,
        reply: () => Effect.void,
        update: () => Effect.void,
        delete: Effect.void
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
