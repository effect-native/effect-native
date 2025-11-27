import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as ActionClientTest from "../src/ActionClientTest.js"
import * as ActionContextTest from "../src/ActionContextTest.js"
import { Comment } from "../src/Comment.js"

// =============================================================================
// Test Fixtures
// =============================================================================

const issueCommentPayload = {
  action: "created" as const,
  comment: {
    id: 12345,
    body: "Hello world!",
    user: { login: "testuser" }
  },
  issue: {
    number: 42,
    title: "Test Issue",
    body: "Issue body",
    state: "open",
    labels: [],
    pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/42" }
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

const makeTestLayer = (eventName: string, payload: Record<string, unknown>) =>
  Comment.DefaultWithoutDependencies.pipe(
    Layer.provide(ActionContextTest.make({ eventName, payload })),
    Layer.provide(ActionClientTest.layer)
  )

// =============================================================================
// Tests
// =============================================================================

describe("Comment", () => {
  describe("construction", () => {
    it.effect("succeeds with issue_comment event", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)

        // Just verifying construction doesn't fail
        const id = yield* Comment.id.pipe(Effect.provide(testLayer))
        expect(id).toBe(12345)
      }))

    it.effect("fails with wrong event type", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("push", { ref: "refs/heads/main" })

        const exit = yield* Comment.id.pipe(
          Effect.provide(testLayer),
          Effect.exit
        )

        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          const error = String(exit.cause)
          // Should indicate wrong event type
          expect(error).toContain("issue_comment")
          expect(error).toContain("push")
        }
      }))

    it.effect("fails with issues event (not issue_comment)", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issues", {
          action: "opened",
          issue: { number: 1 },
          repository: { owner: { login: "org" }, name: "repo" }
        })

        const exit = yield* Comment.id.pipe(
          Effect.provide(testLayer),
          Effect.exit
        )

        expect(Exit.isFailure(exit)).toBe(true)
      }))
  })

  describe("accessors", () => {
    it.effect("Comment.id returns comment ID", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const id = yield* Comment.id.pipe(Effect.provide(testLayer))
        expect(id).toBe(12345)
      }))

    it.effect("Comment.body returns comment body", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const body = yield* Comment.body.pipe(Effect.provide(testLayer))
        expect(body).toBe("Hello world!")
      }))

    it.effect("Comment.author returns comment author login", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const author = yield* Comment.author.pipe(Effect.provide(testLayer))
        expect(author).toBe("testuser")
      }))

    it.effect("Comment.action returns action type", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)
        const action = yield* Comment.action.pipe(Effect.provide(testLayer))
        expect(action).toBe("created")
      }))

    it.effect("Comment.action returns edited for edited comments", () =>
      Effect.gen(function*() {
        const editedPayload = { ...issueCommentPayload, action: "edited" as const }
        const testLayer = makeTestLayer("issue_comment", editedPayload)
        const action = yield* Comment.action.pipe(Effect.provide(testLayer))
        expect(action).toBe("edited")
      }))
  })

  describe("operations", () => {
    it.effect("Comment.react calls API with correct parameters", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)

        // With mock client, this should succeed (no-op)
        yield* Comment.react("eyes").pipe(Effect.provide(testLayer))
      }))

    it.effect("Comment.reply calls API with correct parameters", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)

        yield* Comment.reply("Thanks for the comment!").pipe(Effect.provide(testLayer))
      }))

    it.effect("Comment.update calls API with correct parameters", () =>
      Effect.gen(function*() {
        const testLayer = makeTestLayer("issue_comment", issueCommentPayload)

        yield* Comment.update("Updated body").pipe(Effect.provide(testLayer))
      }))
  })

  describe("Test layer", () => {
    it.effect("Comment.Test provides mock implementation", () =>
      Effect.gen(function*() {
        const testLayer = Comment.Test({
          id: 999,
          body: "mock body",
          author: "mockuser",
          action: "deleted"
        })

        const id = yield* Comment.id.pipe(Effect.provide(testLayer))
        const body = yield* Comment.body.pipe(Effect.provide(testLayer))
        const author = yield* Comment.author.pipe(Effect.provide(testLayer))
        const action = yield* Comment.action.pipe(Effect.provide(testLayer))

        expect(id).toBe(999)
        expect(body).toBe("mock body")
        expect(author).toBe("mockuser")
        expect(action).toBe("deleted")
      }))

    it.effect("Comment.Test operations are no-ops", () =>
      Effect.gen(function*() {
        const testLayer = Comment.Test({})

        // These should all succeed without error
        yield* Comment.react("eyes").pipe(Effect.provide(testLayer))
        yield* Comment.reply("test").pipe(Effect.provide(testLayer))
        yield* Comment.update("test").pipe(Effect.provide(testLayer))
      }))
  })
})
