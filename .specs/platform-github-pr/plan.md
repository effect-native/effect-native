# Plan: High-Level GitHub Actions DX

## Status: Implementation Complete, Tests Missing

The implementation (Comment.ts, Issue.ts, PR.ts) has been completed and committed.
However, **no tests exist for these modules**. This plan focuses on adding tests.

---

## Phase A: Comment Module Tests

### A1. RED: Write Comment.test.ts with failing tests
- Test: Construction succeeds with issue_comment event
- Test: Construction fails with wrong event type (push, issues, etc.)
- Test: `Comment.id` returns comment ID from payload
- Test: `Comment.body` returns comment body from payload
- Test: `Comment.author` returns comment user login from payload
- Test: `Comment.action` returns action from payload
- Test: `Comment.react()` calls correct API endpoint
- Test: `Comment.reply()` calls correct API endpoint
- Test: `Comment.update()` calls correct API endpoint
- Test: `Comment.Test()` layer works for mocking

**Verification:** `pnpm test` shows failing tests

### A2. GREEN: Fix any implementation bugs found by tests
- If tests reveal implementation bugs, fix them
- Run tests until all pass

**Verification:** `pnpm test` shows Comment tests passing

---

## Phase B: Issue Module Tests

### B1. RED: Write Issue.test.ts with failing tests
- Test: Construction succeeds with issue_comment event
- Test: Construction succeeds with issues event
- Test: Construction fails with wrong event type (push, pull_request, etc.)
- Test: `Issue.number` returns issue number from payload
- Test: `Issue.title` returns issue title from payload
- Test: `Issue.body` returns issue body (may be null)
- Test: `Issue.state` returns issue state
- Test: `Issue.isPullRequest` returns true when issue.pull_request exists
- Test: `Issue.isPullRequest` returns false for regular issues
- Test: `Issue.labels` returns label names
- Test: `Issue.addLabel()` calls correct API endpoint
- Test: `Issue.removeLabel()` calls correct API endpoint
- Test: `Issue.close` calls correct API endpoint
- Test: `Issue.reopen` calls correct API endpoint
- Test: `Issue.Test()` layer works for mocking

**Verification:** `pnpm test` shows failing tests

### B2. GREEN: Fix any implementation bugs found by tests

**Verification:** `pnpm test` shows Issue tests passing

---

## Phase C: PR Module Tests

### C1. RED: Write PR.test.ts with failing tests
- Test: Construction succeeds with issue_comment on PR
- Test: Construction succeeds with pull_request event
- Test: Construction fails with issue_comment on regular issue (NotPullRequestError)
- Test: Construction fails with issues event (NotPullRequestError)
- Test: Construction fails with push event
- Test: `PR.number` returns PR number
- Test: `PR.headRef` returns head branch ref
- Test: `PR.baseRef` returns base branch ref
- Test: `PR.draft` returns draft status
- Test: `PR.diff` calls correct API endpoint with diff media type
- Test: `PR.files` calls correct API endpoint
- Test: `PR.commits` calls correct API endpoint
- Test: `PR.mergeable` calls correct API endpoint
- Test: `PR.merge()` calls correct API endpoint
- Test: `PR.requestReview()` calls correct API endpoint
- Test: `PR.Test()` layer works for mocking

**Verification:** `pnpm test` shows failing tests

### C2. GREEN: Fix any implementation bugs found by tests

**Verification:** `pnpm test` shows PR tests passing

---

## Phase D: Integration Tests

### D1. Write integration test showing full workflow pattern
- Test: User code using Comment + Issue + PR together
- Test: Conditional logic based on `Issue.isPullRequest`
- Test: Error handling with `Effect.catchTag`
- Test: Mock layers allow full workflow testing

**Verification:** `pnpm test` shows integration tests passing

### D2. Update scratchpad action to use new modules
- Refactor main.ts to use Comment/Issue/PR instead of old pattern
- Verify CI workflow still passes

**Verification:** CI green on push

---

## Phase E: Documentation

### E1. Add JSDoc examples to each module
- Ensure each public export has usage examples
- Examples should be copy-pasteable

### E2. Update package README (if exists)

---

## Test Fixtures Needed

### Sample Payloads

```typescript
// issue_comment on PR
const issueCommentOnPRPayload = {
  action: "created",
  comment: { id: 123, body: "test", user: { login: "alice" } },
  issue: { 
    number: 42, 
    title: "Test PR",
    body: "PR body",
    state: "open",
    labels: [{ name: "bug" }],
    pull_request: { url: "..." }
  },
  repository: { owner: { login: "org" }, name: "repo" }
}

// issue_comment on regular issue  
const issueCommentOnIssuePayload = {
  action: "created",
  comment: { id: 123, body: "test", user: { login: "alice" } },
  issue: { 
    number: 42,
    title: "Bug report",
    body: null,
    state: "open",
    labels: []
    // No pull_request field
  },
  repository: { owner: { login: "org" }, name: "repo" }
}

// pull_request event
const pullRequestPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    head: { ref: "feature" },
    base: { ref: "main" },
    draft: false
  },
  repository: { owner: { login: "org" }, name: "repo" }
}
```

---

## Current State Checklist

- [x] Comment.ts implemented
- [x] Issue.ts implemented
- [x] PR.ts implemented
- [x] Exported from index.ts
- [x] Type checks pass
- [x] Build succeeds
- [ ] Comment.test.ts written
- [ ] Issue.test.ts written
- [ ] PR.test.ts written
- [ ] Integration tests written
- [ ] Scratchpad uses new modules
- [ ] CI validates real usage
