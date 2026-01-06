# FSDB Pull: Design

## Overview

The fsdb-pull system uses a homeostatic reconciliation model implemented through Effect services. The core abstraction is a reconciliation loop that evaluates invariant rules, generates work orders for violations, and executes them with isolation and concurrency.

## Architecture

### Service Layer Diagram

```
CLI (fsdb pull / fsdb status)
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                  Reconciler                          │
│  - evaluateRules() → Gap[]                          │
│  - generateWorkOrders(gaps) → WorkOrder[]           │
│  - executeWorkOrders(orders) → Result[]             │
│  - loop until stable                                │
└─────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   RuleEngine    │ │  WorkOrderStore │ │   GitService    │
│ - evaluate()    │ │ - create()      │ │ - status()      │
│ - listRules()   │ │ - resolve()     │ │ - commit()      │
└─────────────────┘ │ - list()        │ │ - add()         │
         │          └─────────────────┘ └─────────────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  GitHubSource   │ │  FileSystem     │ │  WorktreeService│
│ - fetchIssues() │ │ - read()        │ │ - create()      │
│ - fetchPRs()    │ │ - write()       │ │ - update()      │
│ - fetchComments │ │ - delete()      │ │ - status()      │
│ - ...           │ │ - scan()        │ │ - remove()      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │
         ▼
┌─────────────────┐
│  GitHubClient   │
│ (implementation │
│  detail - defer │
│  to impl phase) │
└─────────────────┘
```

### Core Services

#### Reconciler Service

The top-level orchestrator that runs the homeostatic reconciliation loop.

- **reconcile**: Main entry point for `fsdb pull` - runs full loop with remote fetches
- **status**: Entry point for `fsdb status` - evaluates rules without remote calls or modifications

Loop behavior:

1. Verify git status is clean for `.fsdb/`
2. Fetch remote state (skip for status command)
3. Scan local filesystem state
4. Evaluate all rules, collect gaps
5. Generate work orders for gaps
6. Execute work orders concurrently with isolation
7. Record failures as work order files
8. Auto-close resolved work orders
9. Repeat until no actionable gaps remain
10. Commit all changes to git

#### RuleEngine Service

Evaluates invariant rules against current state and produces gaps.

Rules are registered by type with a common interface:

- **evaluate**: Given remote and local state, produce list of gaps
- **priority**: Order of evaluation (some rules depend on others)

Rule types:

- OpenIssuesExist
- OpenPRsExist
- PRWorktreesExist
- WorktreeBranchCorrect
- WorktreeFresh
- NoStaleItems
- MetadataFresh
- CommentsComplete
- ReviewsComplete
- ReviewCommentsComplete
- FilesValid
- GitClean

#### WorkOrderStore Service

Manages work order files in `.fsdb/workorders/`.

- **create**: Write a new work order file for a detected gap
- **resolve**: Delete a work order file when its gap no longer exists
- **list**: Scan existing work order files
- **execute**: Run a work order's remediation action

#### GitService Service

Handles git operations for the `.fsdb/` directory.

- **status**: Check if `.fsdb/` has uncommitted changes
- **add**: Stage files
- **commit**: Create commit with message
- **isClean**: Predicate for clean state

#### GitHubSource Service

Fetches data from GitHub API for configured repositories.

- **fetchOpenIssues**: Get all open issues for a repo
- **fetchOpenPRs**: Get all open PRs for a repo
- **fetchIssueComments**: Get comments for an issue
- **fetchPRComments**: Get comments for a PR
- **fetchPRReviews**: Get reviews for a PR
- **fetchPRReviewComments**: Get review comments for a PR
- **fetchPRHead**: Get current head SHA for a PR

Depends on GitHubClient (implementation deferred - likely generated from OpenAPI or wrapper around octokit).

#### FileSystem Service

Reads and writes markdown files with YAML frontmatter.

- **readItem**: Parse a markdown file into structured data
- **writeItem**: Serialize structured data to markdown file
- **deleteItem**: Remove a file or folder
- **scanFolder**: List contents of a folder
- **exists**: Check if path exists

Uses `@effect/platform` FileSystem under the hood.

#### WorktreeService Service

Manages git worktrees for PR folders.

- **create**: Create a new worktree on a branch
- **update**: Fetch and update worktree to new SHA
- **remove**: Remove a worktree
- **status**: Check worktree state (branch, HEAD SHA, dirty files)
- **hasUncommittedChanges**: Predicate for dirty worktree

### Data Models

#### Generic Identity Fields

All items share common identity fields in frontmatter:

- **id**: Numeric identifier from source system
- **source**: Source system name (github, notion, linear)
- **type**: Item type (issue, pr, comment, review, review-comment)

#### GitHub Issue

Frontmatter fields (matching GitHub API closely):

- id, source, type (generic identity)
- number
- title
- state (open)
- author (login)
- labels (array of names)
- assignees (array of logins)
- milestone (title or null)
- created_at
- updated_at
- html_url
- parent (path to repo folder, relative to .fsdb/)

Body: Issue body markdown

#### GitHub PR

Frontmatter fields (matching GitHub API closely):

- id, source, type (generic identity)
- number
- title
- state (open)
- author (login)
- labels (array of names)
- assignees (array of logins)
- milestone (title or null)
- created_at
- updated_at
- html_url
- head_ref (branch name)
- head_sha
- base_ref
- draft (boolean)
- mergeable (boolean or null)
- parent (path to repo folder, relative to .fsdb/)

Body: PR body markdown

#### Comment

Frontmatter fields:

- id, source, type (generic identity)
- author (login)
- created_at
- updated_at
- html_url
- parent (path to issue or PR folder, relative to .fsdb/)

Body: Comment body markdown

#### Review

Frontmatter fields:

- id, source, type (generic identity)
- author (login)
- state (approved, changes_requested, commented, pending)
- created_at
- html_url
- parent (path to PR folder, relative to .fsdb/)

Body: Review body markdown (may be empty)

#### Review Comment

Frontmatter fields:

- id, source, type (generic identity)
- review_id
- author (login)
- path (file path in PR)
- line (line number or null)
- created_at
- updated_at
- html_url
- parent (path to PR folder, relative to .fsdb/)

Body: Comment body markdown

#### Work Order

Frontmatter fields:

- id (generated UUID)
- type: workorder
- rule (which invariant was violated)
- target (path to affected item, relative to .fsdb/)
- error (error message if execution failed)
- created_at
- resolved_at (null until resolved)

Body: Human-readable description of the issue and suggested resolution

#### Config

YAML structure for `.fsdb/config.yaml`:

- sources: Array of source configurations
  - github: Array of owner/repo strings

### File Naming

#### Folders

- Issue folder: `issue-{number}-{slug}/`
- PR folder: `pr-{number}-{slug}/`
- Slug derived from title at creation time, lowercase, alphanumeric and hyphens only, truncated to reasonable length

#### Files

- Issue file: `ISSUE.md`
- PR file: `PR.md`
- Comment file: `comment-{id}.md`
- Review file: `review-{id}.md`
- Review comment file: `review-comment-{id}.md`
- Work order file: `workorder-{uuid}.md`

### Schema Declaration

Each markdown file declares its schema in frontmatter using standard YAML schema reference:

```yaml
# yaml-language-server: $schema=../../schemas/github-issue.json
---
id: 42
source: github
type: issue
...
```

Schema files stored in `.fsdb/schemas/` as JSON Schema.

Alternatively, use a simpler `$schema` field in frontmatter:

```yaml
---
$schema: github-issue
id: 42
source: github
type: issue
...
```

The implementation will support both; the simpler field is preferred for readability.

### Error Handling Strategy

#### Error Categories

- **ReconciliationError**: Top-level errors in the reconciliation loop
- **GitHubError**: Errors from GitHub API (rate limits, auth, network)
- **FileSystemError**: Errors reading/writing files
- **GitError**: Errors from git operations
- **WorktreeError**: Errors managing worktrees
- **ValidationError**: Schema validation failures
- **WorkOrderError**: Errors executing work orders

#### Isolation Strategy

Each work order executes in isolation:

- Failures are caught and recorded as work order files
- Other work orders continue executing
- The loop continues until no actionable gaps remain

A gap becomes "unactionable" when:

- Its work order has failed and the failure is recorded
- Manual intervention by Bramwell is required

### CLI Design

#### fsdb pull

1. Read config from `.fsdb/config.yaml`
2. Verify git clean for `.fsdb/`
3. Run reconciliation loop
4. Output summary of changes made

#### fsdb status

1. Read config from `.fsdb/config.yaml`
2. Skip git clean check (read-only)
3. Scan local state only (no remote fetches)
4. Evaluate rules, list gaps
5. Output current state and violations

### Test Strategy

#### Unit Tests

- RuleEngine: Test each rule individually with mock state
- WorkOrderStore: Test CRUD operations on work order files
- FileSystem: Test markdown parsing/serialization
- File naming: Test slug generation, ID extraction

#### Integration Tests

- Reconciler: Test full loop with mock GitHubSource
- GitService: Test against real git repo in temp directory
- WorktreeService: Test worktree operations in temp directory

#### End-to-End Tests

- Full pull against a test repository
- Verify filesystem state matches expected structure
- Verify git commits are created correctly

### Concurrency Model

- Multiple repositories processed concurrently
- Within a repository, multiple issues/PRs processed concurrently
- Worktree operations serialized per repository (git limitation)
- Work order execution uses Effect's fiber model for isolation
- Rate limiting handled at GitHubSource layer (deferred to implementation)

### AGENTS.md Content

The `.fsdb/AGENTS.md` file describes:

1. What FSDB is and its purpose
2. The homeostatic reconciliation model
3. Folder structure and file formats
4. How to read and interpret files
5. Notes folder for private annotations
6. Work orders and how to resolve them
7. Reference to schema files
8. Warning about not editing synced files directly (use outbox)
