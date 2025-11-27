/**
 * Internal helpers for extracting data from webhook payloads.
 *
 * @since 1.0.0
 * @internal
 */
import type {
  IssueCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent
} from "@octokit/webhooks-types"
import type * as ActionContext from "../ActionContext.js"

// =============================================================================
// Issue payload helpers
// =============================================================================

export interface IssuePayloadData {
  readonly owner: string
  readonly repo: string
  readonly issue: IssueCommentEvent["issue"] | IssuesEvent["issue"]
}

export const getIssuePayload = (ctx: ActionContext.ActionContext): IssuePayloadData | undefined => {
  if (ctx.eventName === "issue_comment") {
    const payload = ctx.payload as unknown as IssueCommentEvent
    return { owner: payload.repository.owner.login, repo: payload.repository.name, issue: payload.issue }
  }
  if (ctx.eventName === "issues") {
    const payload = ctx.payload as unknown as IssuesEvent
    return { owner: payload.repository.owner.login, repo: payload.repository.name, issue: payload.issue }
  }
  return undefined
}

// =============================================================================
// Comment payload helpers
// =============================================================================

export interface CommentPayloadData {
  readonly owner: string
  readonly repo: string
  readonly issueNumber: number
  readonly comment: IssueCommentEvent["comment"]
  readonly action: IssueCommentEvent["action"]
}

export const getCommentPayload = (ctx: ActionContext.ActionContext): CommentPayloadData | undefined => {
  if (ctx.eventName === "issue_comment") {
    const payload = ctx.payload as unknown as IssueCommentEvent
    return {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issueNumber: payload.issue.number,
      comment: payload.comment,
      action: payload.action
    }
  }
  return undefined
}

// =============================================================================
// PR payload helpers
// =============================================================================

export interface PRPayloadData {
  readonly owner: string
  readonly repo: string
  readonly prNumber: number
  /** PR details from payload - undefined for issue_comment (needs API fetch) */
  readonly pr: PullRequestEvent["pull_request"] | undefined
}

export const getPRPayload = (ctx: ActionContext.ActionContext): PRPayloadData | undefined => {
  if (ctx.eventName === "issue_comment") {
    const payload = ctx.payload as unknown as IssueCommentEvent
    if (payload.issue.pull_request) {
      return {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        prNumber: payload.issue.number,
        pr: undefined
      }
    }
    return undefined
  }
  if (ctx.eventName === "pull_request") {
    const payload = ctx.payload as unknown as PullRequestEvent
    return {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber: payload.pull_request.number,
      pr: payload.pull_request
    }
  }
  if (ctx.eventName === "pull_request_review") {
    const payload = ctx.payload as unknown as PullRequestReviewEvent
    return {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber: payload.pull_request.number,
      pr: payload.pull_request as PullRequestEvent["pull_request"]
    }
  }
  if (ctx.eventName === "pull_request_review_comment") {
    const payload = ctx.payload as unknown as PullRequestReviewCommentEvent
    return {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      prNumber: payload.pull_request.number,
      pr: payload.pull_request as PullRequestEvent["pull_request"]
    }
  }
  return undefined
}
