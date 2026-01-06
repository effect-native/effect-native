# FSDB Pull: Implementation Plan

## Overview

This plan follows Red-Green-Refactor TDD. Each module has a RED phase (write failing tests with minimal stubs) followed by a GREEN phase (implement to pass tests).

Package location: `packages-native/fsdb/`

## Phase A: Project Setup

### A1. Package Scaffolding

- Create `packages-native/fsdb/` with standard structure
- Configure package.json, tsconfig files, vitest config
- Add to workspace

**Verification:** `pnpm install` succeeds, `pnpm -F @effect-native/fsdb test` runs (no tests yet)

## Phase B: Core Data Models

### B1. Schema Definitions (RED)

- Write tests for schema parsing/serialization
- Test generic identity fields (id, source, type)
- Test GitHub-specific schemas (Issue, PR, Comment, Review, ReviewComment)
- Test WorkOrder schema
- Test Config schema
- Minimal stub implementations that fail tests

**Verification:** Tests fail with expected schema validation errors

### B2. Schema Definitions (GREEN)

- Implement Effect Schema definitions matching GitHub API shapes
- Implement frontmatter parser using gray-matter or similar
- Implement markdown serializer

**Verification:** `pnpm -F @effect-native/fsdb test` passes for schema tests

## Phase C: File Naming Utilities

### C1. Slug and ID Utilities (RED)

- Test slug generation from titles
- Test ID extraction from folder/file names
- Test folder name generation (issue-{id}-{slug})
- Test file name generation (comment-{id}.md)
- Stub implementations

**Verification:** Tests fail

### C2. Slug and ID Utilities (GREEN)

- Implement slugify function
- Implement ID extraction from paths
- Implement folder/file name generators

**Verification:** Tests pass

## Phase D: FileSystem Service

### D1. FileSystem Service (RED)

- Test readItem (parse markdown with frontmatter)
- Test writeItem (serialize to markdown)
- Test deleteItem
- Test scanFolder
- Test exists
- Use @effect/platform-node FileSystem
- Stub service implementation

**Verification:** Tests fail

### D2. FileSystem Service (GREEN)

- Implement FileSystem service using @effect/platform
- Implement markdown parsing with gray-matter
- Implement serialization

**Verification:** Tests pass

## Phase E: Git Services

### E1. GitService (RED)

- Test status check for .fsdb/ directory
- Test isClean predicate
- Test add operation
- Test commit operation
- Use real git repo in temp directory for tests
- Stub implementation

**Verification:** Tests fail

### E2. GitService (GREEN)

- Implement GitService using child_process git commands
- Handle git output parsing

**Verification:** Tests pass

### E3. WorktreeService (RED)

- Test create worktree
- Test update worktree (fetch + checkout)
- Test remove worktree
- Test status (branch name, HEAD SHA)
- Test hasUncommittedChanges
- Use real git repo in temp directory
- Stub implementation

**Verification:** Tests fail

### E4. WorktreeService (GREEN)

- Implement WorktreeService using git worktree commands
- Handle branch creation and management

**Verification:** Tests pass

## Phase F: WorkOrderStore Service

### F1. WorkOrderStore (RED)

- Test create work order file
- Test list work orders
- Test resolve (delete) work order
- Test work order file format
- Stub implementation

**Verification:** Tests fail

### F2. WorkOrderStore (GREEN)

- Implement WorkOrderStore using FileSystem service
- Generate UUIDs for work order IDs

**Verification:** Tests pass

## Phase G: GitHub Source Service

### G1. GitHubSource Interface (RED)

- Define service interface
- Test with mock implementation
- Test fetchOpenIssues returns expected shape
- Test fetchOpenPRs returns expected shape
- Test fetchIssueComments
- Test fetchPRComments
- Test fetchPRReviews
- Test fetchPRReviewComments
- Test fetchPRHead
- Stub implementation

**Verification:** Tests fail

### G2. GitHubSource Implementation (GREEN)

- Implement GitHubSource using GitHub API
- Use `gh` CLI or octokit wrapper (defer exact choice)
- Handle authentication via GITHUB_TOKEN or `gh auth token`
- Map API responses to schema types

**Verification:** Tests pass (with mocks for API calls)

## Phase H: Rule Engine

### H1. Rule Interface and Registry (RED)

- Define Rule interface (evaluate, priority)
- Define Gap type
- Test rule registration
- Stub implementation

**Verification:** Tests fail

### H2. Rule Interface and Registry (GREEN)

- Implement Rule interface
- Implement rule registry with priority ordering

**Verification:** Tests pass

### H3. Individual Rules (RED)

- Test OpenIssuesExist rule
- Test OpenPRsExist rule
- Test PRWorktreesExist rule
- Test WorktreeBranchCorrect rule
- Test WorktreeFresh rule
- Test NoStaleItems rule
- Test MetadataFresh rule
- Test CommentsComplete rule
- Test ReviewsComplete rule
- Test ReviewCommentsComplete rule
- Test FilesValid rule
- Test GitClean rule
- Each rule tested with mock state scenarios
- Stub implementations

**Verification:** Tests fail

### H4. Individual Rules (GREEN)

- Implement each rule
- Each rule compares remote vs local state and produces gaps

**Verification:** Tests pass

## Phase I: Reconciler Service

### I1. Reconciler Loop (RED)

- Test single iteration: evaluate rules, generate work orders, execute
- Test loop termination when no gaps
- Test loop termination when only unactionable gaps (failed work orders)
- Test failure isolation (one failure doesn't stop others)
- Test auto-close of resolved work orders
- Test git commit at end
- Use mocks for all dependencies
- Stub implementation

**Verification:** Tests fail

### I2. Reconciler Loop (GREEN)

- Implement Reconciler service
- Wire up all dependencies
- Implement loop logic

**Verification:** Tests pass

### I3. Status Command (RED)

- Test status runs rules without remote fetches
- Test status doesn't modify filesystem
- Test status reports gaps
- Stub implementation

**Verification:** Tests fail

### I4. Status Command (GREEN)

- Implement status mode in Reconciler
- Read-only evaluation

**Verification:** Tests pass

## Phase J: CLI

### J1. CLI Commands (RED)

- Test `fsdb pull` invokes Reconciler.reconcile
- Test `fsdb status` invokes Reconciler.status
- Test config loading from .fsdb/config.yaml
- Test error output for missing config
- Stub implementation

**Verification:** Tests fail

### J2. CLI Commands (GREEN)

- Implement CLI using @effect/cli or simple arg parsing
- Wire up Reconciler with real dependencies
- Handle errors gracefully

**Verification:** Tests pass

## Phase K: Integration

### K1. Integration Tests

- Test full pull against mock GitHub API
- Test filesystem state matches expected structure
- Test work orders created for failures
- Test work orders auto-closed on resolution
- Test git commits created

**Verification:** Integration tests pass

### K2. AGENTS.md Generation

- Create .fsdb/AGENTS.md template
- Document folder structure, file formats, rules
- Include in package as template

**Verification:** Manual review of generated AGENTS.md

### K3. Schema Files

- Generate JSON Schema files for each document type
- Place in .fsdb/schemas/ (or bundle with package)

**Verification:** Schemas validate example documents

## Phase L: Documentation and Polish

### L1. Package Documentation

- README.md with usage examples
- JSDoc for public APIs
- Example config file

**Verification:** `pnpm docgen` passes

### L2. Final Validation

- Run full test suite
- Run linter
- Build package
- Manual test against real GitHub repo

**Verification:** `pnpm -F @effect-native/fsdb ok` passes

## Dependency Order Summary

```
A1 (setup)
 └─► B1 → B2 (schemas)
      └─► C1 → C2 (naming)
           └─► D1 → D2 (filesystem)
                ├─► E1 → E2 (git)
                │    └─► E3 → E4 (worktree)
                └─► F1 → F2 (workorders)
                     └─► G1 → G2 (github source)
                          └─► H1 → H2 → H3 → H4 (rules)
                               └─► I1 → I2 → I3 → I4 (reconciler)
                                    └─► J1 → J2 (cli)
                                         └─► K1 → K2 → K3 (integration)
                                              └─► L1 → L2 (docs)
```

## Notes

- GitHub API implementation (G2) may evolve based on chosen approach (octokit wrapper vs generated SDK)
- Rate limiting strategy will be added during G2 implementation
- Concurrency tuning happens during K1 integration testing
