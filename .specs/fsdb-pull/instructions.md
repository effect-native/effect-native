# FSDB Pull: Sync Remote State to Local Filesystem

## Context

Tom, Bramwell, and their AI agents work across multiple external systems (GitHub, eventually Notion, Linear) that each have their own web UIs and APIs. The current workflow requires constant context-switching between websites, slow API calls, and manual coordination.

FSDB is a local filesystem-based database that mirrors data from external sources as markdown files with YAML frontmatter. This enables agents to work with plain files on disk rather than cloud APIs.

This spec covers the **pull phase** - synchronizing remote state to the local filesystem using a homeostatic reconciliation model.

## User Story

As Tom, Bramwell, or one of their AI agents, I want to run `fsdb pull` and have all configured GitHub repositories' open issues and PRs mirrored locally as markdown files, so that I can process everything at once using AI tools without API calls or internet dependency.

## High-Level Goals

- **Homeostatic Reconciliation:** Define rules (invariants), detect gaps, generate explicit work orders, execute work, repeat until stable
- **Single Source of Truth:** `.fsdb/` folder is the only local state - no caches, no CLI-only output
- **Git Integration:** Everything in `.fsdb/` is committed; git status clean before and after reconciliation
- **Anti-Fragile:** System shrugs off chaos - missing folders recreated, invalid folders deleted, failures isolated
- **Explicit Work:** All operations are visible as work orders on disk; no implicit/hidden work
- **Match Remote Schema:** Minimize transformations; keep data shapes dumb and simple

## Out of Scope

- Push/outbox functionality (separate spec: fsdb-push)
- Closed/historical issues and PRs
- Real-time sync or webhooks
- Notion/Linear sources (future specs)
- Rate limiting strategies (implementation detail)
