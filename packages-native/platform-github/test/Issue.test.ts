import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as ActionClientTest from "../src/ActionClientTest.js"
import * as ActionContextTest from "../src/ActionContextTest.js"
import { Issue } from "../src/Issue.js"

// =============================================================================
// Test Fixtures
// =============================================================================

const issueCommentPayload = {
  action: "created",
  comment: {
    id: 12345,
    body: "Hello world!",
    user: { login: "testuser" }
  },
  issue: {
    number: 42,
    title: "Test Issue Title",
    body: "This is the issue body",
    state: "open",
    labels: [{ name: "bug" }, { name: "help wanted" }],
    pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/42" }
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const regularIssuePayload = {
  action: "created",
  comment: {
    id: 12345,
    body: "Hello world!",
    user: { login: "testuser" }
  },
  issue: {
    number: 99,
    title: "Bug Report",
    body: null,
    state: "closed",
    labels: []
    // No pull_request field - regular issue
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const issuesEventPayload = {
  action: "opened",
  issue: {
    number: 123,
    title: "New Issue",
    body: "Issue opened via issues event",
    state: "open",
    labels: [{ name: "enhancement" }]
  },
  repository: {
    owner: { login: "org" },
    name: "repo"
  }
}

const makeTestLayer = (eventName: string, payload: Record<string, unknown>) =>
  Issue.DefaultWithoutDependencies.pipe(
    Layer.provide(ActionContextTest.make({ eventName, payload })),
    Layer.provide(ActionClientTest.layer)
  )

// =============================================================================
// Tests
// =============================================================================

describe("Issue", () => {
  describe("construction", () => {
    it.effect("succeeds with issue_comment event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const num = yield* Issue.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("succeeds with issues event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issues", issuesEventPayload)
        const num = yield* Issue.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(123)
      }))

    it.effect("fails with wrong event type (push)", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("push", { ref: "refs/heads/main" })
        const exit = yield* Issue.number.pipe(Effect.provide(testLayer), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          expect(error).toContain("issue_comment")
        }
      }))

    it.effect("fails with pull_request event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("pull_request", {
          action: "opened",
          pull_request: { number: 1 },
          repository: { owner: { login: "org" }, name: "repo" }
        })
        const exit = yield* Issue.number.pipe(Effect.provide(testLayer), Effect.exit)

        expect(Exit.isFailure(exit)).toBe(true)
      }))
  })

  describe("accessors", () => {
    it.effect("Issue.number returns issue number", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const num = yield* Issue.number.pipe(Effect.provide(testLayer))
        expect(num).toBe(42)
      }))

    it.effect("Issue.title returns issue title", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const title = yield* Issue.title.pipe(Effect.provide(testLayer))
        expect(title).toBe("Test Issue Title")
      }))

    it.effect("Issue.body returns issue body", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const body = yield* Issue.body.pipe(Effect.provide(testLayer))
        expect(body).toBe("This is the issue body")
      }))

    it.effect("Issue.body returns null when body is null", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", regularIssuePayload)
        const body = yield* Issue.body.pipe(Effect.provide(testLayer))
        expect(body).toBeNull()
      }))

    it.effect("Issue.state returns issue state", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const state = yield* Issue.state.pipe(Effect.provide(testLayer))
        expect(state).toBe("open")
      }))

    it.effect("Issue.state returns closed for closed issues", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", regularIssuePayload)
        const state = yield* Issue.state.pipe(Effect.provide(testLayer))
        expect(state).toBe("closed")
      }))

    it.effect("Issue.isPullRequest returns true for PR comments", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const isPR = yield* Issue.isPullRequest.pipe(Effect.provide(testLayer))
        expect(isPR).toBe(true)
      }))

    it.effect("Issue.isPullRequest returns false for regular issues", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", regularIssuePayload)
        const isPR = yield* Issue.isPullRequest.pipe(Effect.provide(testLayer))
        expect(isPR).toBe(false)
      }))

    it.effect("Issue.labels returns label names", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const labels = yield* Issue.labels.pipe(Effect.provide(testLayer))
        expect(labels).toEqual(["bug", "help wanted"])
      }))

    it.effect("Issue.labels returns empty array when no labels", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", regularIssuePayload)
        const labels = yield* Issue.labels.pipe(Effect.provide(testLayer))
        expect(labels).toEqual([])
      }))
  })

  describe("operations", () => {
    it.effect("Issue.addLabel calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        yield* Issue.addLabel("needs-review").pipe(Effect.provide(testLayer))
      }))

    it.effect("Issue.removeLabel calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        yield* Issue.removeLabel("bug").pipe(Effect.provide(testLayer))
      }))

    it.effect("Issue.close calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        yield* Issue.close.pipe(Effect.provide(testLayer))
      }))

    it.effect("Issue.reopen calls API", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", regularIssuePayload)
        yield* Issue.reopen.pipe(Effect.provide(testLayer))
      }))
  })

  describe("Test layer", () => {
    it.effect("Issue.Test provides mock implementation", () =>
      Effect.gen(function*() {
        const testLayer = Issue.Test({
          number: 999,
          title: "Mock Title",
          body: "Mock body",
          state: "closed",
          isPullRequest: true,
          labels: ["mock-label"]
        })

        const num = yield* Issue.number.pipe(Effect.provide(testLayer))
        const title = yield* Issue.title.pipe(Effect.provide(testLayer))
        const body = yield* Issue.body.pipe(Effect.provide(testLayer))
        const state = yield* Issue.state.pipe(Effect.provide(testLayer))
        const isPR = yield* Issue.isPullRequest.pipe(Effect.provide(testLayer))
        const labels = yield* Issue.labels.pipe(Effect.provide(testLayer))

        expect(num).toBe(999)
        expect(title).toBe("Mock Title")
        expect(body).toBe("Mock body")
        expect(state).toBe("closed")
        expect(isPR).toBe(true)
        expect(labels).toEqual(["mock-label"])
      }))

    it.effect("Issue.Test operations are no-ops", () =>
      Effect.gen(function*() {
        const testLayer = Issue.Test({
          number: 1,
          title: "Test",
          body: "Test body",
          state: "open",
          isPullRequest: false
        })

        yield* Issue.addLabel("test").pipe(Effect.provide(testLayer))
        yield* Issue.removeLabel("test").pipe(Effect.provide(testLayer))
        yield* Issue.close.pipe(Effect.provide(testLayer))
        yield* Issue.reopen.pipe(Effect.provide(testLayer))
      }))
  })
})
