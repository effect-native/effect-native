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
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { ActionContextError } from "./ActionError.js"
import { getIssuePayload } from "./internal/payload.js"

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

    const data = getIssuePayload(ctx)
    if (!data) {
      return yield* Effect.fail(
        new ActionContextError({
          reason: "EventMismatch",
          description: `Issue service requires 'issue_comment' or 'issues' event, got '${ctx.eventName}'`
        })
      )
    }

    const { owner, repo, issue } = data

    return {
      /** The issue number. */
      number: Effect.sync(() => issue.number),

      /** The issue title. */
      title: Effect.sync(() => issue.title),

      /** The issue body (may be null). */
      body: Effect.sync(() => issue.body ?? null),

      /** The issue state: "open" or "closed". */
      state: Effect.sync(() => issue.state as "open" | "closed"),

      /** Whether this issue is actually a pull request. */
      isPullRequest: Effect.sync(() => issue.pull_request !== undefined),

      /** The issue's labels. */
      labels: Effect.sync((): ReadonlyArray<string> => issue.labels?.map((l) => l.name) ?? []),

      /** Add one or more labels to the issue. */
      addLabel: (label: string, ...labels: ReadonlyArray<string>) =>
        client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
          owner,
          repo,
          issue_number: issue.number,
          labels: [label, ...labels]
        }).pipe(Effect.asVoid),

      /** Remove a label from the issue. */
      removeLabel: (label: string) =>
        client.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
          owner,
          repo,
          issue_number: issue.number,
          name: label
        }).pipe(Effect.asVoid),

      /** Close the issue. */
      close: client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issue.number,
        state: "closed"
      }).pipe(Effect.asVoid),

      /** Reopen the issue. */
      reopen: client.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issue.number,
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
    readonly number: number
    readonly title: string
    readonly body: string | null
    readonly state: "open" | "closed"
    readonly isPullRequest: boolean
    readonly labels?: ReadonlyArray<string>
  }) =>
    Layer.succeed(
      Issue,
      new Issue({
        number: Effect.sync(() => options.number),
        title: Effect.sync(() => options.title),
        body: Effect.sync(() => options.body),
        state: Effect.sync(() => options.state),
        isPullRequest: Effect.sync(() => options.isPullRequest),
        labels: Effect.sync(() => options.labels ?? []),
        addLabel: () => Effect.void,
        removeLabel: () => Effect.void,
        close: Effect.void,
        reopen: Effect.void
      })
    )
}
