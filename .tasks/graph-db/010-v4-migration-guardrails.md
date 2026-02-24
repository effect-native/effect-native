---
title: "graph-db/010: v4 migration guardrails docs"
status: complete
done_when: |
  see packages/graph-db/docs/v4-notes.md
  verify: contains Effect v4 do/don't guidance and service/layer/error/yield examples
basis: |
  Implemented and verified in this branch.
  Proof commands run:
  - bun run check (packages/graph-db)
  - bun test (packages/graph-db)
  - bun run lint-fix (workspace root)
blocked_by:
  - .tasks/graph-db/000-bootstrap.md
artifacts:
  - path: packages/graph-db/docs/v4-notes.md
    description: Migration and style guardrails for contributors/reviewers.
---

# Goal

Document Effect v4 migration constraints and copy/paste-safe patterns for this package.

# Scope

- Add checklist and examples for imports, ServiceMap, yieldables, errors, fork renames, and layering.

# Non-goals

- Implement runtime logic.

# Acceptance Criteria

- S3: `docs/v4-notes.md` exists with do/don't snippets aligned to v4 APIs.
- S3: reviewers can use the file as implementation guardrails.

# Proof Steps

1. Inspect `packages/graph-db/docs/v4-notes.md`.
2. Validate examples reference current imports and naming used by implementation.
