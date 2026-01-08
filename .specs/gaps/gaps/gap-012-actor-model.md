---
id: gap-012
phase: 2
status: open
blocked_by: []
---

# Gap: Actor Model

## Question

How are actors and capabilities modeled?

- Is "actor" a first-class concept in the API?
- How are capabilities defined and matched?
- Is Bramwell just a special actor, or a different concept?
- Can actors be dynamically added/removed?

## Context

Instructions mention "actors with capabilities" and Bramwell as fallback. Need to know if this is core API or implementation detail.

## User Stories & Jobs To Be Done

### Work Routing

**As the reconciliation engine**, I need to route gaps to capable actors, so that work gets done by the right entity.

- Given a gap with required capabilities, find actors who can handle it
- When multiple actors match, select the best one (priority, availability, load)
- When no actor matches, route to Bramwell as fallback catchall

### Actor Management

**As Tom or Bramwell**, I need to add new actors to the system, so that we can expand the squad with new AI agents or collaborators.

- Register an actor with its capabilities (e.g., "code-review", "implementation", "documentation")
- Actor types: human (Bramwell), one-shot AI, agentic swarm, external collaborator
- Each actor needs an identifier, capabilities list, and availability status

**As Tom or Bramwell**, I need to disable or remove actors, so that unavailable resources don't receive work.

- Temporarily disable an actor (vacation, maintenance, rate-limited)
- Permanently remove an actor from the pool
- Gracefully handle in-flight work when an actor is removed

### Actor Discovery

**As a gap processor**, I need to query available actors, so that I can make routing decisions.

- List all registered actors
- Filter actors by capability
- Check if a specific actor is available

### Capability Modeling

**As a system designer**, I need to define what capabilities mean, so that routing is deterministic and understandable.

- Capabilities as typed tags or structured objects?
- Capability inheritance/hierarchy (e.g., "senior-dev" implies "code-review")?
- Capability matching: exact match vs. fuzzy/semantic?

### Fallback Behavior

**As Bramwell**, I need to be the catchall for unrouted work, so that no gap falls through the cracks.

- Bramwell receives anything no other actor can handle
- Bramwell can then manually route, handle, or escalate
- Bramwell is a special actor (always present, cannot be removed)

### Actor Selection Strategy

**As the routing system**, I need a selection strategy when multiple actors can handle a gap, so that work is distributed fairly and efficiently.

- Priority-based selection (prefer AI for routine, human for judgment calls)
- Load balancing across available actors
- Affinity: prefer actors who worked on related gaps
- Override: allow explicit actor assignment to bypass auto-routing

## Resolution

(pending)
