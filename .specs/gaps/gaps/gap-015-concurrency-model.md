---
id: gap-015
phase: 2
status: resolved
blocked_by: []
resolved_date: 2026-01-07
---

# Gap: Concurrency Model

## Question

How does concurrency work?

- Are rules evaluated concurrently or sequentially?
- Are resolutions applied concurrently or sequentially?
- What isolation guarantees exist?
- How are failures in concurrent work handled?

## Context

Instructions mention "full agentic swarms" which implies concurrency. Need to specify the model.

## User Stories & Jobs To Be Done

### Operator Stories (Tom, Bramwell)

**Parallel Rule Evaluation**
- As an operator, I want rules to evaluate concurrently so that large reconciliation sweeps complete faster
- As an operator, I need to control max concurrency to avoid overwhelming external APIs or filesystem
- As an operator, I want to see which rules are currently evaluating when monitoring a swarm

**Parallel Resolution Execution**
- As an operator, I want independent resolutions to run in parallel to maximize throughput
- As an operator, I need dependent resolutions to run sequentially to maintain correctness
- As an operator, I want to configure resolution parallelism separately from rule parallelism

**Failure Handling**
- As an operator, I want one failing concurrent task to not crash the entire reconciliation loop
- As an operator, I need clear visibility into which concurrent branch failed and why
- As an operator, I want to configure retry behavior for failed concurrent operations

### Agent Stories (AI Agents in Swarm)

**Isolation**
- As an agent, I need my workspace isolated from other concurrent agents to avoid conflicts
- As an agent, I want to acquire locks on resources I'm modifying so other agents wait
- As an agent, I need clear error messages when I'm blocked by another agent's work

**Coordination**
- As an agent, I need to signal when my work is complete so dependent agents can proceed
- As an agent, I want to be notified if a task I depend on fails so I can abort early

### System Jobs To Be Done

**JTBD: Run multiple FSDB rules efficiently**
- When reconciling a filesystem database with many rules
- I want to evaluate rules concurrently where safe
- So that the full reconciliation completes in reasonable time

**JTBD: Apply independent fixes in parallel**
- When multiple violations are detected with independent fixes
- I want resolutions to execute concurrently
- So that the system converges faster

**JTBD: Respect rate limits and resource constraints**
- When resolutions involve external APIs (git, LLM providers)
- I want concurrency bounded by configurable limits
- So that I don't hit rate limits or exhaust resources

**JTBD: Maintain consistency under concurrency**
- When multiple agents modify related files
- I want proper isolation and conflict detection
- So that concurrent work doesn't corrupt state

**JTBD: Recover gracefully from partial failures**
- When one concurrent operation fails mid-swarm
- I want other independent operations to complete
- So that progress isn't lost unnecessarily

**JTBD: Choose execution mode per context**
- When running interactively (manual/one-shot)
- I want sequential execution for predictability
- But when running in swarm mode
- I want parallel execution for speed

### Execution Mode Considerations

| Mode | Rule Eval | Resolution | Rationale |
|------|-----------|------------|-----------|
| Manual | Sequential | Sequential | Predictable, easy to follow |
| One-shot AI | Sequential | Sequential | Single agent, no contention |
| Swarm | Parallel | Parallel | Multiple agents, maximize throughput |

### Key Questions for Resolution

1. Should concurrency be opt-in or opt-out per rule/resolution?
2. How do we detect when two resolutions conflict (same file, related resources)?
3. What Effect-TS primitives map to these needs (Fiber, Semaphore, Queue)?
4. How do we visualize concurrent execution state to operators?

## Resolution

**STATUS: RESOLVED** (2026-01-07, via 5-lens analysis)

**Decision: Sequential execution only in v0**

- **Rules**: Evaluate sequentially
- **Resolutions**: Execute sequentially
- **No v0 features**: parallel execution, isolation, conflict detection, swarm mode

**Rationale**:
- Value: Correctness before speed - get it right first
- Mental Model: Easy to follow, easy to debug
- Constraints: Major complexity removed - no race conditions possible
- Failure: No coordination failures, no resource exhaustion
- Progressive: Parallel is clear opt-in for v1+

See: `.specs/gaps/analysis/RECONCILED-REQUIREMENTS.md`
