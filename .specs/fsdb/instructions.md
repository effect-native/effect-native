# FSDB: Filesystem Database for External Data Sources

## Context

Tom, Bramwell, and their AI agents work across multiple external systems (GitHub, eventually Notion, Linear) that each have their own web UIs and APIs. The current workflow requires constant context-switching between websites, slow API calls, and manual coordination.

The goal is to create a local filesystem-based database that mirrors data from these external sources, enabling agents to work with plain files on disk rather than cloud APIs. This supports a daily batch workflow where data is pulled in the morning, processed throughout the day, and changes are pushed in the afternoon.

## User Story

As Tom, Bramwell, or one of their AI agents, I want a local mirror of all open GitHub issues and PRs (and eventually other sources) as markdown files on disk, so that I can:

- Process everything at once using AI tools (OpenRouter) without API rate limits
- Read and analyze data without internet connectivity
- Generate responses and actions in an outbox that requires manual approval before externalization
- Work toward "inbox zero" across all external systems

## High-Level Goals

- **Local-first:** All data lives on the filesystem as human-readable markdown with YAML frontmatter
- **Air-gapped writes:** Tooling can automatically download and generate outbox items, but externalizing changes back to the source requires manual action by Bramwell
- **Multi-source architecture:** Design must support additional sources (Notion, Linear) in the future, with source-specific on-disk layouts
- **Agent-friendly:** AI agents can read files directly and use CLI tools to create/update outbox items
- **Daily batch workflow:** Morning sync, daytime processing, afternoon push cycle
- **Inbox zero mindset:** The workflow goal is to process and resolve all open items

## GitHub-Specific Goals (Initial Implementation)

- Mirror open issues and PRs from configured repositories
- On-disk layout that is understandable at a glance from file/folder names
- Each PR gets its own git worktree as a subfolder for code review
- Include all metadata, body content, comments, reviews, and review comments
- Support multiple repositories via workspace configuration

## Out of Scope

- Closed/historical issues and PRs (only open items)
- Real-time sync or webhooks (manual refresh only)
- General-purpose application or end-user polish
- Patch file storage (using worktrees instead)
- Automatic externalization (air-gap requires manual action)
- Limits on number of items/worktrees (assume no limits for now)
