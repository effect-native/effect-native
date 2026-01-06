---
id: gap-004
phase: 1
status: resolved
blocked_by:
  - gap-001
resolved_date: 2026-01-06
---

# Gap: Scope of Reconciliation

## Question

Is this specifically for filesystem/external-state reconciliation, or a general pattern for any "rules that should be true"?

## Context

The INBOX mentions both FSDB-specific and general applications (lint, AI dedup, etc.). Need to know how general the abstraction should be.

## Resolution

**Decision:** General pattern, but initially targeted at filesystem-specific use cases to maintain focus.

**Approach:**

- Design the core abstractions to be general (rules, gaps, resolutions)
- Implement first for FSDB use case
- Refactor to extract generic pieces later as needed
- Avoid the trap of making it overly generic before version 0

The pattern applies to anything with "rules that should be true" but we won't over-engineer the abstraction upfront.
