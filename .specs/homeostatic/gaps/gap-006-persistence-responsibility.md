---
id: gap-006
phase: 1
status: open
blocked_by:
  - gap-004
  - gap-005
---

# Gap: Work Order Persistence Responsibility

## Question

Does the generic engine define how/where work orders (unresolved gaps) are persisted, or is that the caller's responsibility?

## Context

FSDB uses `.fsdb/workorders/`, but a generic engine might not assume filesystem. Need to know where the abstraction boundary is.

## Resolution

(pending)
