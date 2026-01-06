# FSDB (Parent Spec) - Brain Dump Inbox

Captured from conversation on 2026-01-06.

## Overview

FSDB is a filesystem database for keeping a local mirror of external data sources (GitHub, Notion, Linear) so that AI agents can process everything at once without cloud API calls.

This is the parent spec. Child specs:

- `.specs/fsdb-pull/` - Sync remote state to local filesystem
- `.specs/fsdb-push/` - Externalize outbox items (future)

Both depend on:

- `.specs/homeostatic/` - Generic reconciliation engine

## Original Instructions

Already captured in `.specs/fsdb/instructions.md`.

## Multi-Source Architecture

- Each source has its own on-disk layout
- Source-specific schemas matching remote shapes
- Generic identity model: `id`, `source`, `type`
- Future sources: Notion docs, Linear tickets

## Air Gap Standard

- Tooling downloads automatically (pull)
- Tooling generates outbox items automatically
- Manual action by Bramwell required to externalize (push)
- Single direction data flow, no conflicts

## Daily Workflow

1. Morning: `fsdb pull` - Bramwell syncs all sources
2. Daytime: Agents process, analyze, generate outbox items
3. Afternoon: `fsdb push` - Bramwell externalizes approved changes
4. Repeat

## CLI Commands (Full)

- `fsdb pull` - reconcile local to match remote
- `fsdb push` - externalize outbox items
- `fsdb new <type>` - prep a new outbox item
- `fsdb status` - offline gap detection

## Notes Subfolder

Each issue/PR folder has a `notes/` subfolder for Bramwell's private annotations:

- Never pushed to remote
- Purely local
- Deleted with parent when issue/PR closes (preserved in git history)

## Paths

All paths in file content relative to `.fsdb/` root (not `../../../`).

## Children Point to Parents

- Comment file has frontmatter pointing to parent issue/PR
- Parent does not list children
- Discover children by scanning filesystem
