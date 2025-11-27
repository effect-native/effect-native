import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as IssueComment from "../../src/events/IssueComment.js"
import * as ActionClientTest from "../../src/ActionClientTest.js"
import * as ActionContextTest from "../../src/ActionContextTest.js"

// Sample issue_comment payload
const issueCommentPayload = {
  action: "created",
  comment: {
    id: 12345,
    body: "Hello world!",
    user: { login: "testuser" }
  },
  issue: {
    number: 42,
    pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/42" }
  },
  repository: {
    owner: { login: "my-org" },
    name: "my-repo"
  }
}

describe("IssueComment", () => {
  describe("layer", () => {
    it.effect("creates context from issue_comment event", () =>
      Effect.gen(function* () {
        const testLayer = IssueComment.layer.pipe(
          Layer.provide(ActionContextTest.make({
            eventName: "issue_comment",
            payload: issueCommentPayload
          })),
          Layer.provide(ActionClientTest.layer)
        )

        const ctx = yield* IssueComment.IssueCommentContext.pipe(
          Effect.provide(testLayer)
        )

        expect(ctx.owner).toBe("my-org")
        expect(ctx.repo).toBe("my-repo")
        expect(ctx.issueNumber).toBe(42)
        expect(ctx.commentId).toBe(12345)
        expect(ctx.commentBody).toBe("Hello world!")
        expect(ctx.commentAuthor).toBe("testuser")
        expect(ctx.isPullRequest).toBe(true)
      })
    )

    it.effect("fails with EventMismatch for wrong event type", () =>
      Effect.gen(function* () {
        const testLayer = IssueComment.layer.pipe(
          Layer.provide(ActionContextTest.make({
            eventName: "push",
            payload: { ref: "refs/heads/main" }
          })),
          Layer.provide(ActionClientTest.layer)
        )

        const result = yield* IssueComment.IssueCommentContext.pipe(
          Effect.provide(testLayer),
          Effect.either
        )

        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionContextError")
          expect(result.left.reason).toBe("EventMismatch")
        }
      })
    )

    it.effect("isPullRequest is false for regular issue comments", () =>
      Effect.gen(function* () {
        const issuePayload = {
          ...issueCommentPayload,
          issue: {
            number: 42
            // No pull_request field
          }
        }

        const testLayer = IssueComment.layer.pipe(
          Layer.provide(ActionContextTest.make({
            eventName: "issue_comment",
            payload: issuePayload
          })),
          Layer.provide(ActionClientTest.layer)
        )

        const ctx = yield* IssueComment.IssueCommentContext.pipe(
          Effect.provide(testLayer)
        )

        expect(ctx.isPullRequest).toBe(false)
      })
    )
  })

  describe("addReaction", () => {
    it.effect("succeeds when called", () =>
      Effect.gen(function* () {
        const testLayer = IssueComment.layer.pipe(
          Layer.provide(ActionContextTest.make({
            eventName: "issue_comment",
            payload: issueCommentPayload
          })),
          Layer.provide(ActionClientTest.layer)
        )

        const ctx = yield* IssueComment.IssueCommentContext.pipe(
          Effect.provide(testLayer)
        )
        // Just verify it doesn't throw
        yield* ctx.addReaction("eyes").pipe(Effect.provide(testLayer))
      })
    )
  })

  describe("reply", () => {
    it.effect("succeeds when called", () =>
      Effect.gen(function* () {
        const testLayer = IssueComment.layer.pipe(
          Layer.provide(ActionContextTest.make({
            eventName: "issue_comment",
            payload: issueCommentPayload
          })),
          Layer.provide(ActionClientTest.layer)
        )

        const ctx = yield* IssueComment.IssueCommentContext.pipe(
          Effect.provide(testLayer)
        )
        // Just verify it doesn't throw
        yield* ctx.reply("Thanks!").pipe(Effect.provide(testLayer))
      })
    )
  })
})
