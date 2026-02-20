# Evidence Log: PR Helpers Module

## Source 1: Prototype PR Service (action-demo)

**Location:** `worktrees/openrouter-monorepo--sdk-effects/packages/action-demo/src/PR/index.ts`

### [SUPPORTS] Service pattern works

The prototype uses `Context.Tag` and `Layer.effect` pattern successfully.

### [SUPPORTS] Core operations match hypothesis

The prototype implements:

- `addReaction(reaction)`
- `replyToComment(body)`
- `getDiff()` with truncation at 100KB
- `assertIsPullRequest()`
- Context properties via `context: PRContext`

### [FALSIFIES] Single event type assumption

The prototype is hardcoded to `issue_comment` event. But PR workflows may be triggered by:

- `issue_comment` (comment on PR)
- `pull_request` (PR opened, synchronized, etc.)
- `pull_request_review` (review submitted)
- `pull_request_review_comment` (review comment)

The current prototype doesn't handle these different events elegantly.

### [SUPPORTS] Unsafe cast required

The prototype requires: `const payload = ctx.payload as unknown as IssueCommentPayload`
This motivates our typed payload work.

## Source 2: OpenRouter Workflows

**Location:** `worktrees/openrouter-monorepo--sdk-effects/.github/workflows/`

### [SUPPORTS] issue_comment is primary use case

`or-ai-comment.yaml` uses `issue_comment` trigger for the AI responder.

### [FALSIFIES] Only need issue_comment support

Other workflows exist that could benefit from PR helpers:

- `openapi-pr-comment.yaml` - Posts OpenAPI diff comments
- Various CI workflows that could post status comments

## Source 3: Current ActionContext.typedPayload

**Location:** `packages-native/platform-github/src/ActionContext.ts`

### [SUPPORTS] Type-safe payload access pattern

`typedPayload("issue_comment")` validates event name and returns typed payload.
This can be the foundation for event-specific services.

## Source 4: @octokit/webhooks-types

### [SUPPORTS] Comprehensive type coverage

Types available for all common PR-related events:

- `IssueCommentEvent`
- `PullRequestEvent`
- `PullRequestReviewEvent`
- `PullRequestReviewCommentEvent`

## Summary of Falsifications

1. **Single event assumption falsified**: Need to support multiple event types
2. **Simple layer composition falsified**: Different events have different context shapes

## Implications for Model Revision

The service shouldn't be a single `PR` service, but rather:

- Event-specific services (e.g., `IssueCommentContext`, `PullRequestContext`)
- Shared helper functions that work with any PR number
- Type-safe payload access as the foundation
