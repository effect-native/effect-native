/**
 * Internal implementation for IssueCommentContext.
 *
 * @internal
 */
import type { IssueCommentEvent } from "@octokit/webhooks-types"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "../../ActionClient.js"
import * as ActionContext from "../../ActionContext.js"
import type { ActionApiError } from "../../ActionError.js"
import { ActionContextError } from "../../ActionError.js"

/** @internal */
export type Reaction = "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"

/** @internal */
export const TypeId = Symbol.for(
  "@effect-native/platform-github/IssueCommentContext"
)

/** @internal */
export type TypeId = typeof TypeId

/** @internal */
export interface IssueCommentContext {
  readonly [TypeId]: TypeId
  readonly payload: IssueCommentEvent
  readonly owner: string
  readonly repo: string
  readonly issueNumber: number
  readonly commentId: number
  readonly commentBody: string
  readonly commentAuthor: string
  readonly isPullRequest: boolean
  readonly addReaction: (reaction: Reaction) => Effect.Effect<void, ActionApiError>
  readonly reply: (body: string) => Effect.Effect<void, ActionApiError>
}

/** @internal */
export const IssueCommentContext = GenericTag<IssueCommentContext>(
  "@effect-native/platform-github/IssueCommentContext"
)

/** @internal */
export const layer: Layer.Layer<
  IssueCommentContext,
  ActionContextError,
  ActionContext.ActionContext | ActionClient.ActionClient
> = Layer.effect(
  IssueCommentContext,
  Effect.gen(function* () {
    const ctx = yield* ActionContext.ActionContext
    const client = yield* ActionClient.ActionClient

    // Validate event type
    if (ctx.eventName !== "issue_comment") {
      return yield* Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Expected 'issue_comment' event but got '${ctx.eventName}'`
        })
      )
    }

    const payload = ctx.payload as unknown as IssueCommentEvent

    const owner = payload.repository.owner.login
    const repo = payload.repository.name
    const issueNumber = payload.issue.number
    const commentId = payload.comment.id
    const commentBody = payload.comment.body
    const commentAuthor = payload.comment.user.login
    const isPullRequest = payload.issue.pull_request !== undefined

    return {
      [TypeId]: TypeId,
      payload,
      owner,
      repo,
      issueNumber,
      commentId,
      commentBody,
      commentAuthor,
      isPullRequest,

      addReaction: (reaction: Reaction) =>
        Effect.asVoid(
          client.request("POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions", {
            owner,
            repo,
            comment_id: commentId,
            content: reaction
          })
        ),

      reply: (body: string) =>
        Effect.asVoid(
          client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
            owner,
            repo,
            issue_number: issueNumber,
            body
          })
        )
    } satisfies IssueCommentContext
  })
)
