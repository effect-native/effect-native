# Stress Test: Breaking the Model

## What-If Scenarios

### 1. What if the event type changes mid-execution?

**Scenario:** User starts with `issue_comment` layer but accidentally provides wrong payload in tests.
**Impact:** Type unsafety at runtime.
**Mitigation:** Layer validates at construction time, not at each method call.
**Result:** Model survives - validation happens once at layer construction.

### 2. What if the user wants to post to a different PR?

**Scenario:** Action receives `issue_comment` on PR #1, but wants to post to PR #2.
**Impact:** Current model assumes same PR throughout.
**Mitigation:** Shared PR operations accept `owner/repo/number` as params.
**Result:** Model modified - operations should be parameterized, not bound to context.

### 3. What if there's a massive PR with 10MB diff?

**Scenario:** User calls `getDiff()` on huge PR.
**Impact:** Memory issues, potential OOM.
**Mitigation:** Already implemented: truncation at 100KB with message.
**Result:** Model survives - truncation is a known constant.

### 4. What if user wants both IssueCommentContext AND to make arbitrary PR calls?

**Scenario:** Action needs typed context for comment trigger, but also queries other PRs.
**Impact:** Need both context-bound and unbound operations.
**Decision:**

- Context services: bound to triggered event
- PR operations: accept explicit params
  **Result:** Model survives - dual API design.

### 5. What if `pull_request` event needs comment operations?

**Scenario:** PR opened → action posts a welcome comment.
**Impact:** `PullRequestContext` doesn't have `commentId`.
**Decision:** That's expected - `pull_request` events don't have trigger comments.

- `addReaction` only makes sense for `issue_comment`
- `createComment` works for any PR (parameterized)
  **Result:** Model survives - different operations for different contexts.

### 6. What if user wants to reply to a specific comment (not trigger comment)?

**Scenario:** Action scans all comments, wants to reply to a different one.
**Impact:** Need operations that accept `commentId` param.
**Decision:** Add `replyToComment(issueNumber, commentId, body)` variant.
**Result:** Model modified - add parameterized variants.

### 7. What if multiple events could trigger the same workflow?

**Scenario:** Workflow triggered by `issue_comment` OR `pull_request`.
**Impact:** Which context to use?
**Decision:**

- Use `ActionContext.typedPayload()` with runtime check
- Or use discriminated union pattern
  **Result:** Model survives - `typedPayload()` handles this.

### 8. What if octokit types change?

**Scenario:** GitHub adds new event fields, @octokit/webhooks-types updates.
**Impact:** Our types could become stale or break.
**Mitigation:** Types are passthrough from @octokit/webhooks-types.
**Result:** Model survives - we don't define our own types.

## Breaking Points Found

1. **Operations need dual API**: Context-bound AND parameterized
2. **Reply to arbitrary comments**: Need `replyToComment` with commentId param

## Recommended Changes

1. Keep `IssueCommentContext.addReaction()` for convenience (bound to trigger comment)
2. Also export `PR.addReaction(owner, repo, commentId, reaction)` for flexibility
3. Export both context-bound and parameterized variants where sensible
