---
id: gap-014
phase: 2
status: open
blocked_by:
  - gap-012
---

# Gap: Escalation Semantics

## Question

When a gap is escalated to Bramwell:

- Is it considered "resolved" (loop continues)?
- Or "unresolved but handled" (different status)?
- Does escalation always succeed, or can it fail?
- What data is written for Bramwell to act on?

## Context

This affects loop termination and the meaning of "stable state."

## User Stories & Jobs To Be Done

### Bramwell: Reviewing Escalated Gaps

**As Bramwell**, I need to see escalated gaps in my work orders **so that** I can manually resolve issues the engine cannot handle automatically.

- **JTBD**: When I check work orders, I want to immediately understand what went wrong, what was tried, and what I need to do
- **Data needed**: Gap description, drift details, resolutions attempted (with failure reasons), relevant file paths, timestamps
- **Success**: I can act on the gap without needing to re-diagnose the problem

### Bramwell: Distinguishing Priority

**As Bramwell**, I need to distinguish escalated gaps from other work items **so that** I can prioritize human-required interventions appropriately.

- **JTBD**: Quickly filter/sort work orders to see what specifically needs my judgment vs routine tasks
- **Success**: Escalated gaps are clearly marked and filterable in work orders

### Bramwell: Closing the Loop

**As Bramwell**, after resolving an escalated gap, I need the work order to auto-close **so that** my work orders stay clean and I know what's still pending.

- **JTBD**: When I fix the underlying issue (code change, config update, rule extension), the system should detect resolution and clean up
- **Success**: No manual work order cleanup required; resolved gaps disappear from my queue

### Engine: Terminating Gracefully

**As the reconciliation engine**, I need to know whether escalation succeeded **so that** I can terminate the loop without leaving gaps in limbo.

- **JTBD**: After escalating, mark the gap as "escalated" (not "resolved" or "unresolved") so the loop can complete
- **Success**: Loop terminates cleanly; gap status reflects it's awaiting human action

### Engine: Handling Escalation Failures

**As the reconciliation engine**, I need to handle escalation failures **so that** gaps don't silently disappear.

- **JTBD**: If writing to work orders fails (disk full, permissions, etc.), the gap should remain marked as unresolved with an escalation failure reason
- **Scenarios**: File write failure, invalid work orders path, concurrent write conflicts
- **Success**: No silent failures; unescalated gaps are retried or reported

### Tom/Agents: Understanding Gap Status

**As Tom or an agent**, I need to distinguish between gaps that are:
1. **Unresolved** - no resolution attempted yet
2. **Escalated** - awaiting Bramwell's action
3. **Resolved** - fixed (automatically or manually)

**so that** I understand the true state of the system at any point.

- **JTBD**: Query gap status to know what's blocking progress and who owns it
- **Success**: Clear status enum that reflects ownership (engine, Bramwell, done)

### Bramwell: Extending Rules

**As Bramwell**, after manually resolving a gap, I want to optionally extend the resolution rules **so that** similar gaps auto-resolve in the future.

- **JTBD**: Turn manual fixes into automated resolutions over time (the "gradually extend rules" pattern)
- **Success**: Repeated escalations for the same pattern decrease over time

## Resolution

(pending)
