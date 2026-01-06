# FSDB Pull - Brain Dump Inbox

Captured from conversation on 2026-01-06.

## Dependency

This spec depends on `.specs/homeostatic/` for the core reconciliation engine.

## Purpose

Local filesystem database mirroring GitHub (and eventually Notion, Linear) for:

- Bulk AI processing via OpenRouter without API rate limits
- Offline access to repo data
- Agent-friendly plain files on disk
- Daily batch workflow (morning sync, daytime process, afternoon push)

## Target Users

Tom, Bramwell, and their AI agents. Internal tooling only.

## Workflow Pattern

1. **Morning:** Bramwell runs `fsdb pull` - sync all configured repos
2. **Daytime:** Agents read md+yaml files, generate outbox items via CLI
3. **Afternoon:** Bramwell runs `fsdb push` - externalize approved changes
4. **Repeat daily**

Goal: Inbox zero across all external systems.

## Core Principles

### Homeostatic Reconciliation

Define rules (invariants), detect gaps, generate work orders, execute, repeat until stable.

### Single Direction Data Flow

- Remote → Local (pull phase)
- Local Outbox → Remote (push phase)
- No two-way binding, no conflicts
- Remote is source of truth, local mirrors get clobbered

### Anti-Fragile

- Random extra files: ignored
- Missing folders: recreated
- Renamed slugs: no problem (match by ID in filename)
- Failures isolated: one item failing doesn't abort others
- Git history preserves everything deleted

### Explicit Work

- Nothing is CLI-only output
- `.fsdb/` is single source of truth
- All work visible as work orders on disk
- Implicit work forbidden

## Git Integration

- Everything in `.fsdb/` committed to git
- Git status clean before and after reconciliation
- Git history is the archive for deleted items
- Reconciliation auto-commits

## File Identity

- ID baked into filename: `issue-042-whatever/`, `comment-789.md`
- ID also in YAML frontmatter (generic shape):
  ```yaml
  id: 42
  source: github
  type: issue
  ```
- Slug portion ignored by code, exists for Bramwell
- Slugs immutable once created (derived from title at creation)

## On-Disk Structure

```
.fsdb/
  AGENTS.md                           # What this is, rules, docs
  config.yaml                         # Configured sources
  workorders/                         # Gaps for Bramwell
  github/
    {owner}/
      {repo}/
        issues/
          issue-{id}-{slug}/
            ISSUE.md
            comments/
              comment-{id}.md
            notes/                    # Private local notes
        pulls/
          pr-{id}-{slug}/
            PR.md
            comments/
              comment-{id}.md
            reviews/
              review-{id}.md
            review-comments/
              review-comment-{id}.md
            notes/                    # Private local notes
            worktree/                 # Git worktree at PR head
```

## Schema Philosophy

- Match remote schema as closely as possible
- Minimize transformations
- Keep it dumb and simple
- Every YAML file links its schema at top
- Generic shapes: `id: 123, source: github, type: comment` not `github_comment_id: 123`

## Worktree Rules

- Location: `.fsdb/github/Org/Repo/pulls/pr-XXX-slug/worktree/`
- Always on real branch (not detached HEAD)
- Branch name matches PR folder name (including slug)
- Fresh = HEAD matches PR's head SHA
- Uncommitted changes = error on that PR only, escalate to Bramwell

## Pull Phase Rules (Invariants)

1. Every open issue on remote has a local folder
2. Every open PR on remote has a local folder
3. Every PR folder has a worktree subfolder
4. Every worktree is on a real branch with name matching PR folder
5. Every worktree HEAD matches PR's current head SHA
6. Every local folder corresponds to an open remote item (closed = deleted)
7. All metadata is fresh (matches remote)
8. All comments exist locally
9. All reviews/review comments exist locally
10. All md+yaml files valid against declared schema
11. Git status clean before and after reconciliation
12. Invalid folders (in git history) deleted during reconciliation

## Authentication

- Use `GITHUB_TOKEN` env var if set
- Otherwise use `gh auth token`
- Single token for all repos

## CLI Commands (Pull Phase)

- `fsdb pull` - full reconciliation with remote API calls and git commits
- `fsdb status` - gap detection without remote calls or modifications

## Service Architecture

Multiple services composed together:

- GitHubApi (or appropriate Effect-TS GitHub SDK)
- FileSystem
- Git/WorktreeManager
- Reconciler (from homeostatic engine)

## Configuration

`.fsdb/config.yaml` with configured sources:

```yaml
sources:
  - github: effect-native/effect-native
  - github: OpenRouterTeam/ai-sdk-provider
  # eventually:
  # - notion: workspace-id
  # - linear: team-id
```

## Future: Push Phase

Captured separately, not part of this spec:

- Outbox items have same shape as remote items
- After publish: move to appropriate folder (or delete + re-pull)
- Actions: comment, close, label, create issue, merge PR
- `fsdb new <type>` to prep outbox items
- `fsdb push` to externalize
- Air-gap: manual action required by Bramwell

## Open Design Questions

### 1. Which GitHub SDK?

Options:

- `@effect/platform` HTTP client + raw GraphQL
- `octokit` wrapped in Effect
- Something else in Effect ecosystem

### 2. Data Fetching Strategy

- GraphQL (single query for everything)?
- REST (multiple endpoints)?
- Does it matter for shape matching?

### 3. Worktree Implementation

- Git commands via shell (`git worktree add`)?
- A git library wrapped in Effect?
- Existing patterns in this repo?

### 4. Schema Definition

- Effect Schema (`@effect/schema`)?
- JSON Schema files on disk?
- Both?

### 5. Schema Location

- Bundled in package code?
- `.fsdb/schemas/*.json`?
- Inline reference in frontmatter?

### 6. Error Hierarchy

Domain errors following `Data.TaggedError` with reasons:

- `FsdbError`
- `GitHubApiError`
- `WorktreeError`
- `ValidationError`
- etc.

### 7. Package Location

- `packages/fsdb/`?
- `packages-native/fsdb/`?
- CLI separate from library?
