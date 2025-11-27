/**
 * High-level operations on pull requests in GitHub Actions.
 *
 * This module provides PR-specific operations. All accessors automatically
 * fail if the current context is not a pull request (pit of success pattern).
 *
 * @example
 * ```ts
 * import { PR, Comment } from "@effect-native/platform-github"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   // These auto-fail if not a PR - no manual checks needed!
 *   const diff = yield* PR.diff
 *   const files = yield* PR.files
 *
 *   yield* Comment.reply(`This PR changes ${files.length} files`)
 * })
 * ```
 *
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"
import { getPRPayload } from "./internal/payload.js"

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when attempting PR operations on a non-PR context.
 *
 * @since 1.0.0
 * @category errors
 */
export class NotPullRequestError extends Data.TaggedError("NotPullRequestError")<{
  readonly message: string
}> {}

// =============================================================================
// Types
// =============================================================================

/**
 * A file changed in a pull request.
 *
 * @since 1.0.0
 * @category models
 */
export interface PRFile {
  readonly filename: string
  readonly status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged"
  readonly additions: number
  readonly deletions: number
  readonly changes: number
  readonly patch?: string
}

/**
 * A commit in a pull request.
 *
 * @since 1.0.0
 * @category models
 */
export interface PRCommit {
  readonly sha: string
  readonly message: string
  readonly author: string
}

// =============================================================================
// Internal response types (GitHub REST API shapes)
// =============================================================================

/**
 * Subset of PR fields returned by GET /repos/{owner}/{repo}/pulls/{pull_number}
 * @internal
 */
interface PullRequestResponse {
  readonly head: { readonly ref: string }
  readonly base: { readonly ref: string }
  readonly draft?: boolean
  readonly mergeable: boolean | null
}

/**
 * Subset of Issue fields returned by GET /repos/{owner}/{repo}/issues/{issue_number}
 * @internal
 */
interface IssueLabelsResponse {
  readonly labels: ReadonlyArray<{ readonly name: string }>
}

// =============================================================================
// Constants
// =============================================================================

const MAX_DIFF_CHARS = 100_000

// =============================================================================
// Service
// =============================================================================

/**
 * PR service providing operations on pull requests.
 *
 * **Pit of Success:** All accessors automatically fail with `NotPullRequestError`
 * if the current context is not a pull request. No manual checks needed!
 *
 * Use this service via its static accessors:
 * - `PR.diff` - Get the PR diff (truncated if too large)
 * - `PR.files` - Get the list of changed files
 * - `PR.commits` - Get the list of commits
 * - `PR.headRef` - Get the head branch ref
 * - `PR.baseRef` - Get the base branch ref
 * - `PR.draft` - Check if PR is a draft
 * - `PR.mergeable` - Check if PR is mergeable
 * - `PR.number` - Get the PR number
 *
 * @since 1.0.0
 * @category service
 */
export class PR extends Effect.Service<PR>()("@effect-native/platform-github/PR", {
  accessors: true,
  effect: Effect.gen(function*() {
    const ctx = yield* ActionContext.ActionContext
    const client = yield* ActionClient.ActionClient

    const data = getPRPayload(ctx)
    if (!data) {
      const reason = ctx.eventName === "issue_comment"
        ? "PR operations require a pull request context, but this is a regular issue"
        : `PR operations require a PR-related event, got '${ctx.eventName}'`
      return yield* Effect.fail(new NotPullRequestError({ message: reason }))
    }

    const { owner, pr: prPayload, prNumber, repo } = data

    const fetchPRDetails = client.request<PullRequestResponse>(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      { owner, repo, pull_number: prNumber }
    )

    return {
      /** The PR number. */
      number: Effect.sync(() => prNumber),

      /** The head branch ref (source branch). */
      headRef: prPayload
        ? Effect.sync(() => prPayload.head.ref)
        : fetchPRDetails.pipe(Effect.map((pr) => pr.head.ref)),

      /** The base branch ref (target branch). */
      baseRef: prPayload
        ? Effect.sync(() => prPayload.base.ref)
        : fetchPRDetails.pipe(Effect.map((pr) => pr.base.ref)),

      /** Whether the PR is a draft. */
      draft: prPayload
        ? Effect.sync(() => prPayload.draft ?? false)
        : fetchPRDetails.pipe(Effect.map((pr) => pr.draft ?? false)),

      /** Get the PR diff. Large diffs are truncated. */
      diff: client.request<string>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber, mediaType: { format: "diff" } }
      ).pipe(Effect.map((response) => {
        const diff = typeof response === "string" ? response : String(response)
        return diff.length > MAX_DIFF_CHARS
          ? `${diff.slice(0, MAX_DIFF_CHARS)}\n\n... (diff truncated)`
          : diff
      })),

      /** Get the list of files changed in the PR. */
      files: client.paginate<PRFile>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
        { owner, repo, pull_number: prNumber }
      ),

      /** Get the list of commits in the PR. */
      commits: client.paginate<{ sha: string; commit: { message: string; author: { name: string } | null } }>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
        { owner, repo, pull_number: prNumber }
      ).pipe(Effect.map((commits) =>
        commits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name ?? "unknown"
        }))
      )),

      /** Check if the PR is mergeable. Returns null if still computing. */
      mergeable: client.request<PullRequestResponse>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber }
      ).pipe(Effect.map((pr) => pr.mergeable)),

      /** Merge the PR. */
      merge: (options?: { method?: "merge" | "squash" | "rebase"; commitTitle?: string; commitMessage?: string }) =>
        client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
          owner,
          repo,
          pull_number: prNumber,
          merge_method: options?.method,
          commit_title: options?.commitTitle,
          commit_message: options?.commitMessage
        }).pipe(Effect.asVoid),

      /** Request reviewers for the PR. */
      requestReview: (reviewer: string, ...reviewers: ReadonlyArray<string>) =>
        client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
          owner,
          repo,
          pull_number: prNumber,
          reviewers: [reviewer, ...reviewers]
        }).pipe(Effect.asVoid),

      /** Add one or more labels to the PR. */
      addLabel: (label: string, ...labels: ReadonlyArray<string>) =>
        client.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
          owner,
          repo,
          issue_number: prNumber,
          labels: [label, ...labels]
        }).pipe(Effect.asVoid),

      /** Remove a label from the PR. */
      removeLabel: (label: string) =>
        client.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
          owner,
          repo,
          issue_number: prNumber,
          name: label
        }).pipe(Effect.asVoid),

      /** Get the PR's labels. */
      labels: client.request<IssueLabelsResponse>(
        "GET /repos/{owner}/{repo}/issues/{issue_number}",
        { owner, repo, issue_number: prNumber }
      ).pipe(Effect.map((issue) => issue.labels.map((l) => l.name)))
    } as const
  }),
  dependencies: [ActionContext.layer, ActionClient.Default]
}) {
  /**
   * Test layer for PR service.
   *
   * @since 1.0.0
   * @category layers
   */
  static Test = (options?: {
    readonly number?: number
    readonly headRef?: string
    readonly baseRef?: string
    readonly draft?: boolean
    readonly diff?: string
    readonly files?: ReadonlyArray<PRFile>
    readonly commits?: ReadonlyArray<PRCommit>
    readonly mergeable?: boolean | null
    readonly labels?: ReadonlyArray<string>
  }) =>
    Layer.succeed(
      PR,
      new PR({
        number: Effect.sync(() => options?.number ?? 1),
        headRef: Effect.sync(() => options?.headRef ?? "feature-branch"),
        baseRef: Effect.sync(() => options?.baseRef ?? "main"),
        draft: Effect.sync(() => options?.draft ?? false),
        diff: Effect.sync(() => options?.diff ?? ""),
        files: Effect.sync(() => [...(options?.files ?? [])]),
        commits: Effect.sync(() => [...(options?.commits ?? [])]),
        mergeable: Effect.sync(() => options?.mergeable ?? null),
        merge: () => Effect.void,
        requestReview: () => Effect.void,
        addLabel: () => Effect.void,
        removeLabel: () => Effect.void,
        labels: Effect.sync(() => [...(options?.labels ?? [])])
      })
    )
}

// =============================================================================
// Convenience: Issue.Comment and PR.Comment aliases
// =============================================================================

// Note: These are defined here to avoid circular dependencies.
// They provide `PR.Comment` as an alias for the Comment module.
// Usage: import { PR } from "@effect-native/platform-github"; PR.Comment.react("eyes")
// This is handled at the module level via re-exports in index.ts
