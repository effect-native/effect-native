/**
 * High-level operations on the parent issue in GitHub Actions.
 *
 * This module provides access to the issue that contains the triggering
 * comment (for `issue_comment` events) or the issue itself (for `issues` events).
 *
 * Note: In GitHub, PRs are a type of issue. Use `Issue.isPullRequest` to check,
 * and the `PR` module for PR-specific operations.
 *
 * @example
 * ```ts
 * import { Issue, PR } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const num = yield* Issue.number
 *   const isPR = yield* Issue.isPullRequest
 *
 *   if (isPR) {
 *     const diff = yield* PR.diff  // Only available for PRs
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 */
import type { IssueCommentEvent, IssuesEvent } from "@octokit/webhooks-types"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"

/**
 * Issue service providing operations on the parent issue.
 *
 * Use this service via its static accessors:
 * - `Issue.number` - Get the issue number
 * - `Issue.title` - Get the issue title
 * - `Issue.body` - Get the issue body
 * - `Issue.state` - Get the issue state ("open" or "closed")
 * - `Issue.isPullRequest` - Check if this issue is a pull request
 * - `Issue.labels` - Get the issue labels
 * - `Issue.addLabel(label)` - Add a label to the issue
 * - `Issue.removeLabel(label)` - Remove a label from the issue
 *
 * @since 1.0.0
 * @category service
 */
export class Issue extends Effect.Service<Issue>()("@effect-native/platform-github/Issue", {
  accessors: true,
  effect: Effect.gen(function*() {
    const ctx = yield* ActionContext.ActionContext
    const client = yield* ActionClient.ActionClient

    // Parse payload based on event type
    let owner: string
    let repo: string
    let issueNumber: number
    let issueTitle: string
    let issueBody: string | null
    let issueState: "open" | "closed" | "unknown"
    let isPR: boolean
    let issueLabels: ReadonlyArray<string>

    if (ctx.eventName === "issue_comment") {
      const payload = ctx.payload as unknown as IssueCommentEvent
      owner = payload.repository.owner.login
      repo = payload.repository.name
      issueNumber = payload.issue.number
      issueTitle = payload.issue.title
      issueBody = payload.issue.body
      issueState = payload.issue.state
      isPR = payload.issue.pull_request !== undefined
      issueLabels = payload.issue.labels?.map((l) => l.name) ?? []
    } else if (ctx.eventName === "issues") {
      const payload = ctx.payload as unknown as IssuesEvent
      owner = payload.repository.owner.login
      repo = payload.repository.name
      issueNumber = payload.issue.number
      issueTitle = payload.issue.title
      issueBody = payload.issue.body
      issueState = payload.issue.state ?? "unknown"
      isPR = payload.issue.pull_request !== undefined
      issueLabels = payload.issue.labels?.map((l) => l.name) ?? []
    } else {
      return yield* Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Issue service requires 'issue_comment' or 'issues' event, got '${ctx.eventName}'`
        })
      )
    }

    return {
      /**
       * The issue number.
       */
      number: Effect.succeed(issueNumber),

      /**
       * The issue title.
       */
      title: Effect.succeed(issueTitle),

      /**
       * The issue body (may be null).
       */
      body: Effect.succeed(issueBody),

      /**
       * The issue state: "open" or "closed".
       */
      state: Effect.succeed(issueState),

      /**
       * Whether this issue is actually a pull request.
       */
      isPullRequest: Effect.succeed(isPR),

      /**
       * The issue's labels.
       */
      labels: Effect.succeed(issueLabels),

      /**
       * Add a label to the issue.
       */
      addLabel: (label: string) =>
        client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
          owner,
          repo,
          issue_number: issueNumber,
          labels: [label]
        }).pipe(Effect.asVoid),

      /**
       * Remove a label from the issue.
       */
      removeLabel: (label: string) =>
        client.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
          owner,
          repo,
          issue_number: issueNumber,
          name: label
        }).pipe(Effect.asVoid),

      /**
       * Close the issue.
       */
      close: client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issueNumber,
        state: "closed"
      }).pipe(Effect.asVoid),

      /**
       * Reopen the issue.
       */
      reopen: client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issueNumber,
        state: "open"
      }).pipe(Effect.asVoid)
    } as const
  }),
  dependencies: [ActionContext.layer, ActionClient.layer("")]
}) {
  /**
   * Test layer for Issue service.
   *
   * @since 1.0.0
   * @category layers
   */
  static Test = (options: {
    readonly number?: number
    readonly title?: string
    readonly body?: string | null
    readonly state?: "open" | "closed" | "unknown"
    readonly isPullRequest?: boolean
    readonly labels?: ReadonlyArray<string>
  }) =>
    Layer.succeed(
      Issue,
      new Issue({
        number: Effect.succeed(options.number ?? 1),
        title: Effect.succeed(options.title ?? "Test Issue"),
        body: Effect.succeed(options.body ?? null),
        state: Effect.succeed(options.state ?? "open"),
        isPullRequest: Effect.succeed(options.isPullRequest ?? false),
        labels: Effect.succeed(options.labels ?? []),
        addLabel: () => Effect.void,
        removeLabel: () => Effect.void,
        close: Effect.void,
        reopen: Effect.void
      })
    )
}
