---
id: gap-013
phase: 2
status: resolved
blocked_by: []
resolved_date: 2026-01-07
---

# Gap: Loop Termination

## Question

When does the reconciliation loop terminate?

- Single pass (run all rules once)?
- Iterate until no new gaps?
- Iterate until only escalated gaps remain?
- Max iterations to prevent infinite loops?

## Context

Instructions say "loop until stable" but requirements need precise termination conditions.

## User Stories & Jobs To Be Done

### Actors

- **Tom**: Project owner who triggers reconciliation and needs confidence in system behavior
- **Bramwell**: Human-in-the-loop who handles escalated gaps that require judgment
- **Agents**: Automated systems that execute reconciliation and need clear stopping rules

### User Stories

**Running a Single Pass**
- As Tom, I want to run a single reconciliation pass so that I can see what gaps exist without triggering automatic resolution.
- As an agent, I need to execute all rules exactly once so that I can report current system state without side effects.

**Iterating Until Stable**
- As Tom, I want the loop to continue until no actionable gaps remain so that I don't have to manually re-run reconciliation.
- As an agent, I need to detect when the system has reached steady state so that I can terminate and report success.

**Preventing Infinite Loops**
- As Tom, I want a maximum iteration limit so that runaway loops don't consume resources indefinitely.
- As an agent, I need circuit-breaker behavior so that I can fail gracefully if stability is unreachable.
- As Bramwell, I want notification when max iterations are hit so that I can investigate the underlying cause.

**Understanding Why the Loop Stopped**
- As Tom, I want to know the termination reason (stable, max iterations, error, escalation) so that I can trust or investigate the outcome.
- As Bramwell, I want to see which gaps caused escalation so that I can prioritize my review.
- As an agent, I need structured termination metadata so that I can include it in reports and logs.

**Timeout and Resource Constraints**
- As Tom, I want reconciliation to respect time budgets so that it fits into my workflow without blocking.
- As an agent, I need to honor timeout signals so that I can checkpoint progress and exit cleanly.

**Resuming an Interrupted Loop**
- As Tom, I want to resume reconciliation from where it left off so that I don't lose progress after an interruption.
- As an agent, I need to persist loop state so that I can restore context on restart.
- As Bramwell, I want visibility into partial runs so that I can decide whether to continue or reset.

### Jobs To Be Done

| Job | Trigger | Success Criteria |
|-----|---------|------------------|
| Execute single reconciliation pass | Manual trigger or dry-run mode | All rules evaluated once, report generated |
| Drive system to stability | Standard reconciliation run | Zero actionable gaps, or only escalated gaps remain |
| Prevent unbounded execution | Any reconciliation run | Loop terminates within configured limits |
| Communicate termination reason | Loop exit | Clear, structured indication of why loop stopped |
| Enforce resource budget | Time-sensitive context | Loop respects timeout, exits gracefully |
| Support resumption | Crash, timeout, or manual stop | State persisted, can continue from checkpoint |

## Resolution

**STATUS: RESOLVED** (2026-01-07, via 5-lens analysis)

**Decision: Terminate on stable OR max-iterations, always report reason**

- **Stable**: No new actionable gaps (escalated gaps are "handled")
- **Max iterations**: Hard safety limit (default: 10)
- **Timeout**: External (use Effect's timeout)
- **Termination reason**: Enum `stable | max_iterations | error`
- **No v0 features**: resumption, checkpointing, custom termination conditions

**Rationale**:
- Value: Bounded, predictable execution fits workflows
- Mental Model: System seeks homeostasis (stability)
- Constraints: One termination strategy, simple to implement
- Failure: Must never lie about why it stopped
- Progressive: Default limits work, adjust as needed

See: `.specs/gaps/analysis/RECONCILED-REQUIREMENTS.md`
