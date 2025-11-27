import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as ActionClientTest from "../src/ActionClientTest.js"
import * as ActionContextTest from "../src/ActionContextTest.js"
import { NotPullRequestError, PR } from "../src/PR.js"

// =============================================================================
// Test Fixtures
// =============================================================================

const pullRequestPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    head: { ref: "feature-branch" },
    base: { ref: "main" },
    draft: false
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const draftPullRequestPayload = {
  action: "opened",
  pull_request: {
    number: 123,
    head: { ref: "draft-feature" },
    base: { ref: "develop" },
    draft: true
  },
  repository: {
    owner: { login: "org" },
    name: "repo"
  }
}

const issueCommentOnPRPayload = {
  action: "created",
  comment: {
    id: 12345,
    body: "LGTM!",
    user: { login: "reviewer" }
  },
  issue: {
    number: 99,
    title: "Add feature X",
    body: "This PR adds feature X",
    state: "open",
    labels: [],
    pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/99" }
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const issueCommentOnIssuePayload = {
  action: "created",
  comment: {
    id: 12345,
    body: "Thanks for reporting!",
    user: { login: "maintainer" }
  },
  issue: {
    number: 50,
    title: "Bug report",
    body: "Found a bug",
    state: "open",
    labels: []
    // No pull_request field - regular issue
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const makeTestLayer = (eventName: string, payload: Record<string, unknown>) =>
  PR.DefaultWithoutDependencies.pipe(
    Layer.provide(ActionContextTest.make({ eventName, payload })),
    Layer.provide(ActionClientTest.layer)
  )

// =============================================================================
// Tests
// =============================================================================

describe("PR", () => {
  describe("construction", () => {
    it.effect("succeeds with pull_request event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("succeeds with pull_request_review event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request_review", {
          ...pullRequestPayload,
          action: "submitted",
          review: { id: 1, state: "approved" }
        })
        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("succeeds with pull_request_review_comment event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request_review_comment", {
          ...pullRequestPayload,
          action: "created",
          comment: { id: 1, body: "Nice!" }
        })
        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("succeeds with issue_comment on a PR", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentOnPRPayload)
        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(99)
      }))

    it.effect("fails with issue_comment on regular issue", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentOnIssuePayload)
        const exit = yield* PR.number.pipe(Effect.provide(testLayer), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("NotPullRequestError")
          expect(error).toContain("regular issue")
        }
      }))

    it.effect("fails with issues event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issues", {
          action: "opened",
          issue: { number: 1 },
          repository: { owner: { login: "org" }, name: "repo" }
        })
        const exit = yield* PR.number.pipe(Effect.provide(testLayer), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("NotPullRequestError")
        }
      }))

    it.effect("fails with push event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("push", { ref: "refs/heads/main" })
        const exit = yield* PR.number.pipe(Effect.provide(testLayer), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("NotPullRequestError")
          expect(error).toContain("push")
        }
      }))
  })

  describe("accessors", () => {
    it.effect("PR.number returns PR number", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("PR.headRef returns head branch", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const ref = yield* PR.headRef.pipe(Effect.provide(testLayer))
        expect(ref).toBe("feature-branch")
      }))

    it.effect("PR.baseRef returns base branch", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const ref = yield* PR.baseRef.pipe(Effect.provide(testLayer))
        expect(ref).toBe("main")
      }))

    it.effect("PR.draft returns false for non-draft PRs", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const draft = yield* PR.draft.pipe(Effect.provide(testLayer))
        expect(draft).toBe(false)
      }))

    it.effect("PR.draft returns true for draft PRs", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", draftPullRequestPayload)
        const draft = yield* PR.draft.pipe(Effect.provide(testLayer))
        expect(draft).toBe(true)
      }))
  })

  describe("operations", () => {
    it.effect("PR.diff calls API with diff mediaType", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        // ActionClientTest returns mock responses, so this should succeed
        const diff = yield* PR.diff.pipe(Effect.provide(testLayer))
        // The mock returns an empty object which becomes "[object Object]"
        // This test just verifies the operation runs without error
        expect(typeof diff).toBe("string")
      }))

    it.effect("PR.files calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const files = yield* PR.files.pipe(Effect.provide(testLayer))
        expect(Array.isArray(files)).toBe(true)
      }))

    it.effect("PR.commits calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        const commits = yield* PR.commits.pipe(Effect.provide(testLayer))
        expect(Array.isArray(commits)).toBe(true)
      }))

    it.effect("PR.mergeable calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        // Mock returns undefined which becomes null
        const mergeable = yield* PR.mergeable.pipe(Effect.provide(testLayer))
        expect(mergeable === true || mergeable === false || mergeable === null).toBe(true)
      }))

    it.effect("PR.merge calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        yield* PR.merge().pipe(Effect.provide(testLayer))
      }))

    it.effect("PR.merge with options calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        yield* PR.merge({ method: "squash", commitTitle: "feat: merge PR" }).pipe(Effect.provide(testLayer))
      }))

    it.effect("PR.requestReview calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", pullRequestPayload)
        yield* PR.requestReview(["reviewer1", "reviewer2"]).pipe(Effect.provide(testLayer))
      }))
  })

  describe("Test layer", () => {
    it.effect("PR.Test provides mock implementation", () =>
      Effect.gen(function*() {
        const testLayer = PR.Test({
          number: 999,
          headRef: "test-branch",
          baseRef: "main",
          draft: true,
          diff: "diff --git a/file.ts",
          files: [{ filename: "file.ts", status: "modified", additions: 10, deletions: 5, changes: 15 }],
          commits: [{ sha: "abc123", message: "test commit", author: "tester" }],
          mergeable: true
        })

        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        const headRef = yield* PR.headRef.pipe(Effect.provide(testLayer))
        const baseRef = yield* PR.baseRef.pipe(Effect.provide(testLayer))
        const draft = yield* PR.draft.pipe(Effect.provide(testLayer))
        const diff = yield* PR.diff.pipe(Effect.provide(testLayer))
        const files = yield* PR.files.pipe(Effect.provide(testLayer))
        const commits = yield* PR.commits.pipe(Effect.provide(testLayer))
        const mergeable = yield* PR.mergeable.pipe(Effect.provide(testLayer))

        expect(num).toBe(999)
        expect(headRef).toBe("test-branch")
        expect(baseRef).toBe("main")
        expect(draft).toBe(true)
        expect(diff).toBe("diff --git a/file.ts")
        expect(files).toHaveLength(1)
        expect(files[0].filename).toBe("file.ts")
        expect(commits).toHaveLength(1)
        expect(commits[0].sha).toBe("abc123")
        expect(mergeable).toBe(true)
      }))

    it.effect("PR.Test operations are no-ops", () =>
      Effect.gen(function*() {
        const testLayer = PR.Test({})

        yield* PR.merge().pipe(Effect.provide(testLayer))
        yield* PR.requestReview(["someone"]).pipe(Effect.provide(testLayer))
        yield* PR.addLabel("bug").pipe(Effect.provide(testLayer))
        yield* PR.removeLabel("bug").pipe(Effect.provide(testLayer))
      }))

    it.effect("PR.Test defaults", () =>
      Effect.gen(function*() {
        const testLayer = PR.Test({})

        const num = yield* PR.number.pipe(Effect.provide(testLayer))
        const headRef = yield* PR.headRef.pipe(Effect.provide(testLayer))
        const baseRef = yield* PR.baseRef.pipe(Effect.provide(testLayer))
        const draft = yield* PR.draft.pipe(Effect.provide(testLayer))
        const labels = yield* PR.labels.pipe(Effect.provide(testLayer))

        expect(num).toBe(1)
        expect(headRef).toBe("feature-branch")
        expect(baseRef).toBe("main")
        expect(draft).toBe(false)
        expect(labels).toEqual([])
      }))

    it.effect("PR.Test labels returns mock labels", () =>
      Effect.gen(function*() {
        const testLayer = PR.Test({
          labels: ["bug", "enhancement"]
        })

        const labels = yield* PR.labels.pipe(Effect.provide(testLayer))
        expect(labels).toEqual(["bug", "enhancement"])
      }))
  })

  describe("NotPullRequestError", () => {
    it("has correct tag", () => {
      const error = new NotPullRequestError({ message: "test" })
      expect(error._tag).toBe("NotPullRequestError")
      expect(error.message).toBe("test")
    })
  })
})
