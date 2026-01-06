# FSDB Push: Inbox (Brain Dump)

Raw notes captured during fsdb-pull spec discussion. To be refined into proper spec later.

## Core Concepts

- **Air-gapped writes:** Tooling can automatically generate outbox items, but externalizing changes back to the source requires manual action by Bramwell
- **Outbox items have same shape as remote items:** Minimal transformation between local and remote representations
- **After publish:** Move to appropriate folder (or delete + re-pull and it appears to have moved)

## Outbox Actions to Support

- Post comment
- Close issue
- Add/remove labels
- Create new issue
- Merge PR

## CLI

- `fsdb new <type>` - Prep a new outbox item which can then be modified directly
- `fsdb push` - Externalize outbox items to remote

## Workflow

- Agent or Bramwell creates outbox item via `fsdb new` or manually
- Edit the file directly
- Bramwell runs `fsdb push` (manual action required - air gap)
- Item moves from outbox to appropriate folder (or delete and re-appears on next pull as regular item)

## Design Principles

- Same shape for outbox items and remote items
- Single direction of data flow
- Outbox items become read-only after push
- Manual action required for externalization (air gap standard)
