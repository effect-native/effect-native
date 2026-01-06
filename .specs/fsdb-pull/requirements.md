# FSDB Pull: Requirements

## Functional Requirements

### FR-1: Homeostatic Reconciliation Loop

**FR-1.1:** When the User invokes the pull command, the System shall execute a reconciliation loop that:

1. Evaluates all invariant rules against current state
2. Identifies gaps (rule violations)
3. Generates explicit work orders for each gap
4. Executes work orders concurrently with isolation
5. Repeats until no actionable gaps remain

**FR-1.2:** When a work order fails during execution, the System shall:

- Record the failure as a work order file in the workorders directory
- Continue executing unrelated work orders
- Not abort the reconciliation loop

**FR-1.3:** When a previously-recorded work order's underlying defect no longer exists, the System shall remove the work order file.

### FR-2: Invariant Rules

The System shall enforce the following invariants:

**FR-2.1 (Open Issues Exist):** For each open issue on a configured remote repository, a corresponding local issue folder shall exist.

**FR-2.2 (Open PRs Exist):** For each open pull request on a configured remote repository, a corresponding local PR folder shall exist.

**FR-2.3 (PR Worktrees Exist):** For each local PR folder, a git worktree subfolder shall exist.

**FR-2.4 (Worktree Branch):** Each PR worktree shall be on a real branch (not detached HEAD) with branch name matching the PR folder name.

**FR-2.5 (Worktree Fresh):** Each PR worktree HEAD shall match the PR's current head SHA on remote.

**FR-2.6 (No Stale Items):** For each local issue or PR folder, a corresponding open item shall exist on remote. Folders without a corresponding open remote item shall be deleted.

**FR-2.7 (Metadata Fresh):** All local metadata (frontmatter) shall match current remote state.

**FR-2.8 (Comments Complete):** All comments on remote issues and PRs shall exist as local files.

**FR-2.9 (Reviews Complete):** All reviews on remote PRs shall exist as local files.

**FR-2.10 (Review Comments Complete):** All review comments on remote PRs shall exist as local files.

**FR-2.11 (Valid Files):** All md+yaml files shall be valid against their declared schema.

**FR-2.12 (Git Clean):** Git status for the `.fsdb/` directory shall be clean before and after reconciliation.

### FR-3: File Identity

**FR-3.1:** The System shall identify items by numeric ID embedded in the folder/file name (e.g., `issue-042-slug`, `comment-789.md`).

**FR-3.2:** The System shall ignore the slug portion of folder/file names; slugs exist only for human readability.

**FR-3.3:** When creating a new folder, the System shall derive the slug from the item's title at creation time.

**FR-3.4:** The System shall never rename folders due to title changes on remote; slugs are immutable once created.

**FR-3.5:** Each file shall include the item ID in YAML frontmatter using a generic shape:

- `id`: numeric identifier
- `source`: source system (e.g., "github")
- `type`: item type (e.g., "issue", "pr", "comment", "review")

### FR-4: File Structure

**FR-4.1:** The System shall organize files under `.fsdb/` with the following structure:

```
.fsdb/
  AGENTS.md
  config.yaml
  workorders/
  github/
    {owner}/
      {repo}/
        issues/
          issue-{id}-{slug}/
            ISSUE.md
            comments/
            notes/
        pulls/
          pr-{id}-{slug}/
            PR.md
            comments/
            reviews/
            review-comments/
            notes/
            worktree/
```

**FR-4.2:** All paths in file content shall be relative to the `.fsdb/` root.

**FR-4.3:** Child items shall reference their parent via frontmatter (parent does not list children).

### FR-5: Schema Linking

**FR-5.1:** Every YAML frontmatter section shall declare its schema.

**FR-5.2:** The System shall validate files against their declared schema during reconciliation.

### FR-6: Anti-Fragile Behavior

**FR-6.1:** The System shall ignore unrecognized files and folders within valid parent folders.

**FR-6.2:** The System shall delete invalid folders (folders in git history that violate invariants).

**FR-6.3:** The System shall recreate missing folders required by invariants.

**FR-6.4:** When a PR worktree contains uncommitted local changes, the System shall:

- Record a work order for Bramwell to resolve
- Skip that worktree's freshness update
- Continue processing other items

### FR-7: Git Integration

**FR-7.1:** Before beginning reconciliation, the System shall verify git status is clean for `.fsdb/`.

**FR-7.2:** After completing reconciliation, the System shall commit all changes to `.fsdb/`.

**FR-7.3:** The System shall use git history as the archive for deleted items (no separate "closed" folders).

### FR-8: Configuration

**FR-8.1:** The System shall read source configuration from `.fsdb/config.yaml`.

**FR-8.2:** The configuration shall support multiple GitHub repositories.

### FR-9: Authentication

**FR-9.1:** The System shall use `GITHUB_TOKEN` environment variable if set.

**FR-9.2:** If `GITHUB_TOKEN` is not set, the System shall obtain a token via `gh auth token`.

### FR-10: CLI Commands

**FR-10.1 (Pull):** The `fsdb pull` command shall execute the full reconciliation loop including remote API calls and git commits.

**FR-10.2 (Status):** The `fsdb status` command shall execute gap detection without remote API calls or modifications, reporting current state and violations.

### FR-11: Documentation

**FR-11.1:** The System shall maintain `.fsdb/AGENTS.md` describing the folder's purpose, rules, and usage.

## Non-Functional Requirements

**NFR-1 (Concurrency):** The System shall process multiple repositories and items concurrently where independent.

**NFR-2 (Isolation):** Failures in processing one item shall not affect processing of unrelated items.

**NFR-3 (Idempotency):** Running `fsdb pull` multiple times with no remote changes shall produce identical results.

**NFR-4 (Minimal Transformation):** Local file schemas shall match remote API schemas as closely as possible.

## Constraints

**C-1:** Must use Effect.Service dependency injection patterns for implementation-agnostic design.

**C-2:** Must use appropriate Effect-TS GitHub SDK (specific choice deferred to design phase).

**C-3:** GitHub API rate limits may constrain throughput (handling strategy deferred to design phase).
