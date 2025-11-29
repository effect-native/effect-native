# Requirements: High-Level GitHub Actions DX

## Context

This spec evolved from the original instructions.md. After PREP analysis, we adopted 
`Effect.Service` with `accessors: true` pattern instead of the events/ folder approach.

The goal: Make GitHub Actions as clean as possible for Effect developers.

---

## Functional Requirements

### FR-1: Comment Service

**FR-1.1** (Event-Driven)
When the workflow event is `issue_comment`,
the Comment service shall provide access to the triggering comment's properties.

**FR-1.2** (Event-Driven)  
When the workflow event is NOT `issue_comment`,
the Comment service shall fail with `ActionContextError` reason `EventMismatch`.

**FR-1.3** (Ubiquitous)
The Comment service shall expose these accessors as Effects:
- `Comment.id` → `Effect<number>`
- `Comment.body` → `Effect<string>`
- `Comment.author` → `Effect<string>`
- `Comment.action` → `Effect<"created" | "edited" | "deleted">`

**FR-1.4** (Ubiquitous)
The Comment service shall expose these operations:
- `Comment.react(reaction)` → `Effect<void, ActionApiError>`
- `Comment.reply(body)` → `Effect<void, ActionApiError>`
- `Comment.update(body)` → `Effect<void, ActionApiError>`

### FR-2: Issue Service

**FR-2.1** (Event-Driven)
When the workflow event is `issue_comment` or `issues`,
the Issue service shall provide access to the parent issue's properties.

**FR-2.2** (Event-Driven)
When the workflow event is NOT `issue_comment` or `issues`,
the Issue service shall fail with `ActionContextError` reason `EventMismatch`.

**FR-2.3** (Ubiquitous)
The Issue service shall expose these accessors as Effects:
- `Issue.number` → `Effect<number>`
- `Issue.title` → `Effect<string>`
- `Issue.body` → `Effect<string | null>`
- `Issue.state` → `Effect<"open" | "closed" | "unknown">`
- `Issue.isPullRequest` → `Effect<boolean>`
- `Issue.labels` → `Effect<ReadonlyArray<string>>`

**FR-2.4** (Ubiquitous)
The Issue service shall expose these operations:
- `Issue.addLabel(label)` → `Effect<void, ActionApiError>`
- `Issue.removeLabel(label)` → `Effect<void, ActionApiError>`
- `Issue.close` → `Effect<void, ActionApiError>`
- `Issue.reopen` → `Effect<void, ActionApiError>`

### FR-3: PR Service

**FR-3.1** (Event-Driven) - Pit of Success
When the current context is NOT a pull request,
ALL PR service accessors shall fail with `NotPullRequestError`.

**FR-3.2** (Event-Driven)
When the workflow event is `issue_comment` on a PR,
the PR service shall provide PR operations using the issue number as PR number.

**FR-3.3** (Event-Driven)
When the workflow event is `pull_request`, `pull_request_review`, or `pull_request_review_comment`,
the PR service shall provide PR operations using the payload's PR data.

**FR-3.4** (Ubiquitous)
The PR service shall expose these accessors as Effects:
- `PR.number` → `Effect<number>`
- `PR.diff` → `Effect<string, ActionApiError>` (truncated at 100KB)
- `PR.files` → `Effect<Array<PRFile>, ActionApiError>`
- `PR.commits` → `Effect<Array<PRCommit>, ActionApiError>`
- `PR.headRef` → `Effect<string>`
- `PR.baseRef` → `Effect<string>`
- `PR.draft` → `Effect<boolean>`
- `PR.mergeable` → `Effect<boolean | null, ActionApiError>`

**FR-3.5** (Ubiquitous)
The PR service shall expose these operations:
- `PR.merge(options?)` → `Effect<void, ActionApiError>`
- `PR.requestReview(reviewers)` → `Effect<void, ActionApiError>`

### FR-4: Test Layers

**FR-4.1** (Ubiquitous)
Each service shall provide a static `Test` factory that creates a mock layer:
- `Comment.Test({ id?, body?, author?, action? })`
- `Issue.Test({ number?, title?, isPullRequest?, ... })`
- `PR.Test({ number?, diff?, files?, ... })`

**FR-4.2** (Ubiquitous)
Test layers shall allow testing user code without real GitHub API calls.

---

## Non-Functional Requirements

### NFR-1: Integration Testability

**NFR-1.1**
The modules shall be testable via provided Test layers without network access.

**NFR-1.2**
The modules shall be testable with real GitHub API in CI using the scratchpad action.

### NFR-2: Type Safety

**NFR-2.1**
All payload access shall be type-safe without requiring user type casts.

**NFR-2.2**
Error types shall be properly typed and catchable via `Effect.catchTag`.

### NFR-3: Ergonomics

**NFR-3.1**
Accessors without arguments shall be Effect values, not functions: `PR.diff` not `PR.diff()`.

**NFR-3.2**
Operations with arguments shall be functions: `Comment.reply(body)`.

**NFR-3.3**
Static accessors shall be generated via `Effect.Service` with `accessors: true`.

---

## Constraints

### C-1: Backward Compatibility
All existing exports from `@effect-native/platform-github` shall remain unchanged.

### C-2: Dependencies
Only use existing dependencies. No new npm packages required.

### C-3: Layer Composition
Services shall compose with existing `ActionContext.layer` and `ActionClient.layer`.

---

## Open Questions

### Q-1: Real Integration Testing
How do we verify these modules work in a real GitHub Actions environment?
- Option A: Manual testing via workflow_dispatch
- Option B: Automated integration test in CI that creates/reacts to comments
- Option C: Rely on scratchpad action to smoke test

### Q-2: Error Recovery
Should operations like `Comment.react` silently succeed if already reacted?
Current: Let GitHub API decide (returns success even if duplicate).

### Q-3: Rate Limiting
Should we add retry logic for rate-limited API calls?
Current: User handles via `Effect.retry`.
