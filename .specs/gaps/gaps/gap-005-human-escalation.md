---
id: gap-005
phase: 1
status: resolved
blocked_by:
  - gap-004
resolved_date: 2026-01-06
---

# Gap: Human Escalation as Core Concept

## Question

Is Bramwell (human escalation) a core concept of the engine, or an FSDB-specific application?

## Context

Need to know if "escalation to human when automated resolution fails" is part of the generic engine contract, or just one possible resolution strategy that FSDB happens to use.

## Resolution

**Decision:** Yes, delegation to a fallback actor is a core concept.

**Reframe:** It's not "human escalation" - it's "delegation to an actor with capabilities."

**Key insights:**

1. **Never fully automated** - We will never (in a trillion years) fully automate everything. We don't even want to. There's always a human in some loop somewhere somehow.

2. **Actors with capabilities** - Think of it as delegating to actors that have certain capabilities (skills, tools, knowledge, capacity). Resolution attempts match gaps to actors who can handle them.

3. **Bramwell is the fallback** - Bramwell is the one and only actor with the catchall capability. If no worker with the needed capability is available, it goes to Bramwell by default (it's either him or God).

4. **Bramwell's nature is irrelevant** - Whether Bramwell is human, AI, or something else is none of the engine's business. That's an implementation detail that can evolve.

5. **Evolution** - Exactly where and how humans are in the loop shall naturally evolve over time. The system supports this evolution.

**Implication:** The engine models actors and capabilities, with a designated fallback actor. This is core, not application-specific.
