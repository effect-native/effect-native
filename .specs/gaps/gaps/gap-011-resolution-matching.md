---
id: gap-011
phase: 2
status: resolved
blocked_by:
  - gap-010
resolved_date: 2026-01-07
---

# Gap: Resolution Matching

## Question

How does the engine match gaps to resolutions?

- By gap type (\_tag)?
- By capability required?
- By explicit registration?
- Can one resolution handle multiple gap types?

## Context

Need to understand the dispatch mechanism. This affects how users define and compose resolutions.

## User Stories & Jobs To Be Done

### Resolution Authors

**JTBD: Register handlers for specific gap types**
- As a resolution author, I need to register a handler for a specific gap type (by `_tag`) so that the engine automatically dispatches matching gaps to my resolution.
- As a resolution author, I need to register a single handler for multiple gap types so that I can consolidate related gap handling logic without duplication.

**JTBD: Define conditional matching criteria**
- As a resolution author, I need to specify additional criteria beyond `_tag` (e.g., severity, source, metadata) so that my resolution only handles gaps it's actually equipped to resolve.
- As a resolution author, I need to define capability requirements for my resolution so that the engine only dispatches gaps when the required capabilities are available.

### Engine (System Actor)

**JTBD: Dispatch gaps to appropriate resolutions**
- As the engine, I need to match incoming gaps against registered resolutions so that each gap is routed to a handler that can attempt to close it.
- As the engine, I need to respect resolution priority/ordering so that more specific or preferred resolutions are tried before generic ones.
- As the engine, I need to handle gaps with no matching resolution by escalating to Bramwell (default fallback) so that no gap is silently dropped.

**JTBD: Manage resolution lifecycle**
- As the engine, I need to track which resolutions are available at runtime so that I can make accurate dispatch decisions.
- As the engine, I need to handle resolution registration and deregistration dynamically so that the system can adapt to changing capabilities.

### Tom, Bramwell, and Agents (Elite Mini-Squad)

**JTBD: Understand dispatch behavior**
- As Tom or Bramwell, I need visibility into how gaps are being matched to resolutions so that I can debug unexpected behavior and ensure the system is working as intended.
- As an agent, I need to know what gap types I'm responsible for so that I can focus on my designated domain.

**JTBD: Configure fallback behavior**
- As Bramwell, I need to be the default escalation target for unmatched gaps so that nothing falls through the cracks and human judgment is applied when automation fails.
- As Tom or Bramwell, I need to override or customize fallback behavior so that we can adapt the system to evolving operational needs.

**JTBD: Compose and extend resolutions**
- As a squad member, I need to understand how resolutions compose so that I can build modular, reusable handlers that work together.
- As a squad member, I need to add new resolutions without disrupting existing ones so that the system grows incrementally.

## Resolution

**STATUS: RESOLVED** (2026-01-07, via 5-lens analysis)

**Decision: Dispatch by `_tag` with mandatory Bramwell fallback**

- **Dispatch**: `Map<GapTag, Resolution>` - one resolution per gap type
- **Fallback**: Unmatched gaps escalate to Bramwell (always)
- **Registration**: At startup, not runtime
- **No v0 features**: conditional matching, priority, multi-type handlers

**Rationale**:
- Value: Gaps either auto-resolve or reach a human - nothing dropped
- Mental Model: Pattern matching (like Express routing)
- Constraints: Trivial dispatch table, no ambiguity
- Failure: No silent drops - Bramwell catches all
- Progressive: Tag matching is enough for Day 1

See: `.specs/gaps/analysis/RECONCILED-REQUIREMENTS.md`
