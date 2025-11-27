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
import type { IssueCommentEvent, PullRequestEvent } from "@octokit/webhooks-types"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ActionClient from "./ActionClient.js"
import * as ActionContext from "./ActionContext.js"

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

    // Parse payload and validate PR context
    let owner: string
    let repo: string
    let prNumber: number
    let headRef: string
    let baseRef: string
    let isDraft: boolean

    if (ctx.eventName === "issue_comment") {
      const payload = ctx.payload as unknown as IssueCommentEvent
      // For issue_comment, check if it's on a PR
      if (!payload.issue.pull_request) {
        return yield* Effect.fail(
          new NotPullRequestError({
            message: "PR operations require a pull request context, but this is a regular issue"
          })
        )
      }
      owner = payload.repository.owner.login
      repo = payload.repository.name
      prNumber = payload.issue.number
      // These need to be fetched for issue_comment events
      headRef = ""
      baseRef = ""
      isDraft = false
    } else if (
      ctx.eventName === "pull_request" || ctx.eventName === "pull_request_review" ||
      ctx.eventName === "pull_request_review_comment"
    ) {
      const payload = ctx.payload as unknown as PullRequestEvent
      owner = payload.repository.owner.login
      repo = payload.repository.name
      prNumber = payload.pull_request.number
      headRef = payload.pull_request.head.ref
      baseRef = payload.pull_request.base.ref
      isDraft = payload.pull_request.draft ?? false
    } else {
      return yield* Effect.fail(
        new NotPullRequestError({
          message: `PR operations require a PR-related event, got '${ctx.eventName}'`
        })
      )
    }

    // Helper to fetch PR details (for issue_comment events)
    const fetchPRDetails = Effect.gen(function*() {
      const response = yield* client.request<
        { data: { head: { ref: string }; base: { ref: string }; draft: boolean } }
      >(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber }
      )
      return response
    })

    return {
      /**
       * The PR number.
       */
      number: Effect.succeed(prNumber),

      /**
       * The head branch ref (source branch).
       * For issue_comment events, this fetches from the API.
       */
      headRef: headRef
        ? Effect.succeed(headRef)
        : fetchPRDetails.pipe(Effect.map((pr) => (pr as any).head?.ref ?? (pr as any).data?.head?.ref ?? "")),

      /**
       * The base branch ref (target branch).
       * For issue_comment events, this fetches from the API.
       */
      baseRef: baseRef
        ? Effect.succeed(baseRef)
        : fetchPRDetails.pipe(Effect.map((pr) => (pr as any).base?.ref ?? (pr as any).data?.base?.ref ?? "")),

      /**
       * Whether the PR is a draft.
       */
      draft: Effect.succeed(isDraft),

      /**
       * Get the PR diff.
       * Large diffs are truncated to prevent memory issues.
       */
      diff: Effect.gen(function*() {
        const response = yield* client.request<string>(
          "GET /repos/{owner}/{repo}/pulls/{pull_number}",
          {
            owner,
            repo,
            pull_number: prNumber,
            mediaType: { format: "diff" }
          }
        )
        const diff = typeof response === "string" ? response : String(response)
        return diff.length > MAX_DIFF_CHARS
          ? `${diff.slice(0, MAX_DIFF_CHARS)}\n\n... (diff truncated)`
          : diff
      }),

      /**
       * Get the list of files changed in the PR.
       */
      files: client.paginate<PRFile>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
        { owner, repo, pull_number: prNumber }
      ),

      /**
       * Get the list of commits in the PR.
       */
      commits: client.paginate<{ sha: string; commit: { message: string; author: { name: string } | null } }>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits",
        { owner, repo, pull_number: prNumber }
      ).pipe(
        Effect.map((commits) =>
          commits.map((c) => ({
            sha: c.sha,
            message: c.commit.message,
            author: c.commit.author?.name ?? "unknown"
          }))
        )
      ),

      /**
       * Check if the PR is mergeable.
       * Returns null if GitHub is still computing mergeability.
       */
      mergeable: client.request<{ mergeable: boolean | null }>(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber }
      ).pipe(Effect.map((pr) => (pr as any).mergeable ?? (pr as any).data?.mergeable ?? null)),

      /**
       * Merge the PR.
       */
      merge: (options?: { method?: "merge" | "squash" | "rebase"; commitTitle?: string; commitMessage?: string }) =>
        client.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
          owner,
          repo,
          pull_number: prNumber,
          merge_method: options?.method,
          commit_title: options?.commitTitle,
          commit_message: options?.commitMessage
        }).pipe(Effect.asVoid),

      /**
       * Request reviewers for the PR.
       */
      requestReview: (reviewers: ReadonlyArray<string>) =>
        client.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers", {
          owner,
          repo,
          pull_number: prNumber,
          reviewers: [...reviewers]
        }).pipe(Effect.asVoid)
    } as const
  }),
  dependencies: [ActionContext.layer, ActionClient.layer("")]
}) {
  /**
   * Test layer for PR service.
   *
   * @since 1.0.0
   * @category layers
   */
  static Test = (options: {
    readonly number?: number
    readonly headRef?: string
    readonly baseRef?: string
    readonly draft?: boolean
    readonly diff?: string
    readonly files?: ReadonlyArray<PRFile>
    readonly commits?: ReadonlyArray<PRCommit>
    readonly mergeable?: boolean | null
  }) =>
    Layer.succeed(
      PR,
      new PR({
        number: Effect.succeed(options.number ?? 1),
        headRef: Effect.succeed(options.headRef ?? "feature-branch"),
        baseRef: Effect.succeed(options.baseRef ?? "main"),
        draft: Effect.succeed(options.draft ?? false),
        diff: Effect.succeed(options.diff ?? ""),
        files: Effect.succeed([...(options.files ?? [])]),
        commits: Effect.succeed([...(options.commits ?? [])]),
        mergeable: Effect.succeed(options.mergeable ?? true),
        merge: () => Effect.void,
        requestReview: () => Effect.void
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
