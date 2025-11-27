/**
 * Integration tests for Comment, Issue, and PR services working together.
 *
 * These tests verify the "pit of success" pattern where services automatically
 * fail when used in the wrong context.
 */
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as ActionClientTest from "../src/ActionClientTest.js"
import * as ActionContextTest from "../src/ActionContextTest.js"
import { Comment } from "../src/Comment.js"
import { Issue } from "../src/Issue.js"
import { PR } from "../src/PR.js"

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * An issue_comment event on a PR - all three services should work
 */
const issueCommentOnPR = {
  action: "created",
  comment: {
    id: 12345,
    body: "/review please",
    user: { login: "contributor" }
  },
  issue: {
    number: 42,
    title: "Add new feature",
    body: "This PR adds a new feature",
    state: "open",
    labels: [{ name: "enhancement" }],
    pull_request: { url: "https://api.github.com/repos/org/repo/pulls/42" }
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

/**
 * An issue_comment event on a regular issue - Comment and Issue work, PR fails
 */
const issueCommentOnIssue = {
  action: "created",
  comment: {
    id: 67890,
    body: "Thanks for reporting!",
    user: { login: "maintainer" }
  },
  issue: {
    number: 99,
    title: "Bug: something is broken",
    body: "Steps to reproduce...",
    state: "open",
    labels: [{ name: "bug" }]
    // No pull_request field
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

/**
 * A pull_request event - Issue fails, PR works, Comment fails (no comment)
 */
const pullRequestEvent = {
  action: "opened",
  pull_request: {
    number: 123,
    title: "Feature PR",
    head: { ref: "feature" },
    base: { ref: "main" },
    draft: false
  },
  repository: {
    owner: { login: "org" },
    name: "repo"
  }
}

/**
 * An issues event - Issue works, Comment fails, PR fails
 */
const issuesEvent = {
  action: "opened",
  issue: {
    number: 456,
    title: "New issue",
    body: "Issue body",
    state: "open",
    labels: []
  },
  repository: {
    owner: { login: "org" },
    name: "repo"
  }
}

const makeTestLayers = (eventName: string, payload: Record<string, unknown>) => {
  const contextLayer = ActionContextTest.make({ eventName, payload })
  const clientLayer = ActionClientTest.layer

  return {
    comment: Comment.DefaultWithoutDependencies.pipe(
      Layer.provide(contextLayer),
      Layer.provide(clientLayer)
    ),
    issue: Issue.DefaultWithoutDependencies.pipe(
      Layer.provide(contextLayer),
      Layer.provide(clientLayer)
    ),
    pr: PR.DefaultWithoutDependencies.pipe(
      Layer.provide(contextLayer),
      Layer.provide(clientLayer)
    )
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("Integration", () => {
  describe("issue_comment on PR", () => {
    it.effect("Comment service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnPR)
        const body = yield* Comment.body.pipe(Effect.provide(layers.comment))
        expect(body).toBe("/review please")
      }))

    it.effect("Issue service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnPR)
        const title = yield* Issue.title.pipe(Effect.provide(layers.issue))
        expect(title).toBe("Add new feature")
      }))

    it.effect("PR service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnPR)
        const num = yield* PR.number.pipe(Effect.provide(layers.pr))
        expect(num).toBe(42)
      }))

    it.effect("All three services work together", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnPR)
        const combinedLayer = Layer.mergeAll(layers.comment, layers.issue, layers.pr)

        const commentBody = yield* Comment.body.pipe(Effect.provide(combinedLayer))
        const issueTitle = yield* Issue.title.pipe(Effect.provide(combinedLayer))
        const prNumber = yield* PR.number.pipe(Effect.provide(combinedLayer))

        expect(commentBody).toBe("/review please")
        expect(issueTitle).toBe("Add new feature")
        expect(prNumber).toBe(42)
      }))
  })

  describe("issue_comment on regular issue", () => {
    it.effect("Comment service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnIssue)
        const body = yield* Comment.body.pipe(Effect.provide(layers.comment))
        expect(body).toBe("Thanks for reporting!")
      }))

    it.effect("Issue service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnIssue)
        const title = yield* Issue.title.pipe(Effect.provide(layers.issue))
        expect(title).toBe("Bug: something is broken")
      }))

    it.effect("Issue.isPullRequest returns false", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnIssue)
        const isPR = yield* Issue.isPullRequest.pipe(Effect.provide(layers.issue))
        expect(isPR).toBe(false)
      }))

    it.effect("PR service fails with NotPullRequestError", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issue_comment", issueCommentOnIssue)
        const exit = yield* PR.number.pipe(Effect.provide(layers.pr), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("NotPullRequestError")
          expect(error).toContain("regular issue")
        }
      }))
  })

  describe("pull_request event", () => {
    it.effect("PR service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("pull_request", pullRequestEvent)
        const num = yield* PR.number.pipe(Effect.provide(layers.pr))
        expect(num).toBe(123)
      }))

    it.effect("Comment service fails (wrong event type)", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("pull_request", pullRequestEvent)
        const exit = yield* Comment.body.pipe(Effect.provide(layers.comment), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("issue_comment")
        }
      }))

    it.effect("Issue service fails", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("pull_request", pullRequestEvent)
        const exit = yield* Issue.title.pipe(Effect.provide(layers.issue), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
      }))
  })

  describe("issues event", () => {
    it.effect("Issue service works", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issues", issuesEvent)
        const title = yield* Issue.title.pipe(Effect.provide(layers.issue))
        expect(title).toBe("New issue")
      }))

    it.effect("Comment service fails (wrong event type)", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issues", issuesEvent)
        const exit = yield* Comment.body.pipe(Effect.provide(layers.comment), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("issue_comment")
        }
      }))

    it.effect("PR service fails with NotPullRequestError", () =>
      Effect.gen(function*() {
        const layers = makeTestLayers("issues", issuesEvent)
        const exit = yield* PR.number.pipe(Effect.provide(layers.pr), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("NotPullRequestError")
        }
      }))
  })

  describe("Test layers for downstream testing", () => {
    it.effect("All Test layers work together", () =>
      Effect.gen(function*() {
        const testLayer = Layer.mergeAll(
          Comment.Test({
            id: 1,
            body: "test comment",
            author: "tester",
            action: "created"
          }),
          Issue.Test({
            number: 42,
            title: "Test Issue",
            body: "Test body",
            state: "open",
            isPullRequest: true,
            labels: ["test"]
          }),
          PR.Test({
            number: 42,
            headRef: "feature",
            baseRef: "main",
            draft: false,
            diff: "diff content",
            // @ts-expect-error - partial mock for testing
            files: [{ filename: "test.ts", status: "modified", additions: 1, deletions: 0, changes: 1 }],
            commits: [{ sha: "abc", message: "test", author: "tester" }],
            mergeable: true
          })
        )

        // All accessors should work
        const commentBody = yield* Comment.body.pipe(Effect.provide(testLayer))
        const issueTitle = yield* Issue.title.pipe(Effect.provide(testLayer))
        const prHeadRef = yield* PR.headRef.pipe(Effect.provide(testLayer))

        expect(commentBody).toBe("test comment")
        expect(issueTitle).toBe("Test Issue")
        expect(prHeadRef).toBe("feature")

        // All operations should be no-ops
        yield* Comment.react("eyes").pipe(Effect.provide(testLayer))
        yield* Issue.addLabel("tested").pipe(Effect.provide(testLayer))
        yield* PR.merge().pipe(Effect.provide(testLayer))
      }))
  })
})
