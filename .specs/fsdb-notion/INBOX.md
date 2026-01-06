# FSDB Notion: Inbox (Brain Dump)

Raw notes captured during fsdb-pull spec discussion. To be refined into proper spec later.

## Context

- FSDB is designed to support multiple sources beyond GitHub
- Notion is one of the planned future sources
- Same homeostatic reconciliation model applies

## Design Principles

- Source-specific on-disk layout (like GitHub has its own structure)
- Match remote schema as closely as possible
- Minimize transformations
- Keep it dumb and simple
- Same markdown + YAML frontmatter approach
- Same generic identity shape: `id`, `source: notion`, `type`

## To Be Determined

- What Notion objects to sync (pages, databases, blocks?)
- Folder structure under `.fsdb/notion/`
- Authentication approach
- What constitutes "open" vs "closed" for Notion items
