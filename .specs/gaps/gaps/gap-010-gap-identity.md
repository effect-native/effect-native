---
id: gap-010
phase: 2
status: resolved
blocked_by: []
resolved_date: 2026-01-07
---

# Gap: Gap Identity

## Question

How are gaps uniquely identified for:

- Deduplication (same gap from multiple rules)
- Matching to resolutions
- Tracking across reconciliation loops
- Work order persistence

Is identity based on: type + data hash? Explicit ID field? Something else?

## Context

INBOX mentions "stable deterministic identity" but doesn't specify the mechanism.

## User Stories & Jobs To Be Done

### Deduplication Across Rule Runs

**Who:** The reconciliation engine (on behalf of Tom, Bramwell, and agents)
**What:** Recognize when two gaps represent the same underlying violation
**Why:** Prevent duplicate work orders, avoid noise in gap reports, maintain clean state

- As a rule author, I need gaps with the same semantic meaning to produce the same identity, so that running the same rule twice doesn't create duplicate gaps
- As the engine, I need to merge gaps from different rules that describe the same violation, so that one work order addresses the root cause
- As a developer debugging the system, I need to understand why two gaps were (or weren't) deduplicated, so I can fix identity logic if needed

### Tracking Across Reconciliation Loops

**Who:** The homeostatic loop coordinator
**What:** Correlate gaps across time to detect resolution, regression, or persistence
**Why:** Enable gap lifecycle tracking, measure time-to-resolution, detect flapping

- As the loop, I need to know if a gap from cycle N is "the same" gap as one from cycle N-1, so I can track its age and history
- As Tom or Bramwell reviewing loop health, I need to see gap persistence over time, so I can prioritize chronic issues
- As an agent, I need to know if my previous fix resolved the gap or if it regressed, so I can adjust my approach

### Matching Gaps to Work Orders

**Who:** The work order system and agents executing work
**What:** Link work orders back to the specific gaps they address
**Why:** Close the loop on remediation, verify fixes, prevent orphaned work

- As the work order system, I need a stable gap ID to reference in work orders, so that work orders remain valid even if gap details change slightly
- As an agent completing a work order, I need to verify the target gap still exists before applying a fix, so I don't make unnecessary changes
- As the reconciliation engine, I need to mark gaps as "addressed" when their work order completes, so they're excluded from the next cycle (until re-detected)

### Serialization and Persistence

**Who:** The gap store and any persistence layer
**What:** Store and retrieve gaps with stable references
**Why:** Enable restart recovery, audit trails, and cross-session continuity

- As the gap store, I need a serializable identity that survives process restarts, so gaps aren't "lost" on restart
- As an auditor or Tom reviewing history, I need gap IDs that are stable across serialization boundaries, so I can trace a gap's full lifecycle
- As the system, I need identity that doesn't depend on object reference equality, so gaps can be compared after deserialization

### Human Readability for Debugging

**Who:** Tom, Bramwell, and developers debugging the system
**What:** Inspect gap identities and understand what they represent
**Why:** Faster debugging, easier reasoning about system behavior

- As a developer, I need gap IDs that give me a hint about the gap's content, so I can quickly identify gaps in logs without looking up details
- As Tom reviewing gap reports, I need IDs that are short enough to scan but informative enough to be useful, so I can triage efficiently
- As anyone debugging deduplication issues, I need to see the inputs to identity computation, so I can understand why two gaps did or didn't match

### Comparing Gaps for Equality

**Who:** Any code that needs to compare gaps (dedup, diffing, testing)
**What:** Determine if two gap instances represent the same violation
**Why:** Foundation for all identity-dependent operations

- As a test author, I need a reliable equality check for gaps, so I can assert expected gaps in tests
- As the diffing logic, I need to compute gap equality efficiently, so reconciliation loops stay fast
- As a rule author, I need to understand what fields contribute to identity vs. what fields are metadata, so I can structure gap data correctly

## Resolution

**STATUS: RESOLVED** (2026-01-07, via 5-lens analysis)

**Decision: Content-addressed identity from `_tag` + explicit key fields**

- **Mechanism**: Deterministic hash computed from `_tag` + user-declared identity fields
- **Default**: If no identity fields declared, use `_tag` + all fields
- **Stability**: Identity survives serialization
- **No v0 features**: custom identity functions, semantic matching, cross-session persistence

**Rationale**:
- Value: Trustworthy deduplication without noise
- Mental Model: "Same content = same gap" (like git commits)
- Constraints: Pure, deterministic, no custom logic
- Failure: Err toward more identities (duplicates > lost gaps)
- Progressive: Auto-compute default, override when needed

See: `.specs/gaps/analysis/RECONCILED-REQUIREMENTS.md`
