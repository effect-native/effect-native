# Mental Model Lens Analysis

**Lens Question:** What concepts must users understand? What vocabulary, metaphors, and relationships define this system?

**Target Users:** Tom, Bramwell (human fallback), AI agents working as an elite mini-squad.

---

## Gap-009: Rule API Shape

### New Concept Introduced

**Rule as Declarative Gap Detector**

Users must understand that a Rule is a pure function that observes the world and declares what's wrong—not a procedure that fixes things. Rules are the "eyes" of the system; they see but don't act.

### Leverageable Mental Models

- **React's Pure Components**: Rules are like render functions—given the same context, they return the same gaps. No side effects during detection.
- **Effect-TS Services**: Users familiar with Effect already understand dependency injection. A Rule is just `Effect<Gap[], Error, SomeContext>`.
- **Linting Rules (ESLint/TSLint)**: Each rule checks one thing and reports violations. Users already know "rules produce findings."

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Rule** | A detector that produces gaps | "Checker", "Validator" (too narrow) |
| **Context** | The world-state a rule inspects | "Input", "Parameters" (too generic) |
| **Gap** | What the rule found wrong | "Error", "Issue", "Violation" (too negative) |

**Key insight:** "Rule" is excellent vocabulary—it maps to linting, business rules, and declarative systems users already know.

---

## Gap-010: Gap Identity

### New Concept Introduced

**Gap as a Stable, Deduplicatable Entity**

Users must understand that a gap isn't just a transient notification—it has identity that persists across time and can be matched, tracked, and deduplicated. Gaps are "things" not "events."

### Leverageable Mental Models

- **Git Commits**: Immutable identity derived from content hash. Same content = same identity.
- **React Keys**: Users understand why keys matter for reconciliation—same concept applies to gaps.
- **Database Primary Keys**: Gaps need stable identity for persistence and lookup.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Gap Identity** | The unique "fingerprint" of a gap | "ID", "Hash" (too implementation-y) |
| **Deduplication** | Recognizing "same gap, different sighting" | "Merging" (implies combining data) |
| **Gap Lifecycle** | Birth → resolution/escalation → closure | "Gap state machine" (too formal) |

**Key insight:** Users need to think of gaps as having a "life"—they're born, persist, and eventually close. Identity enables this story.

---

## Gap-011: Resolution Matching

### New Concept Introduced

**Resolution as Pattern-Matched Handler**

Users must understand that resolutions are registered handlers that "claim" certain gaps. The engine dispatches gaps to matching resolutions, similar to how event handlers claim events.

### Leverageable Mental Models

- **Express/Router Middleware**: Route matching by pattern. First match wins (or priority determines).
- **Pattern Matching (switch/match)**: Resolutions match on gap type/properties.
- **Event Handlers**: Subscribe to specific event types.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Resolution** | A handler that closes gaps | "Fixer", "Remediation" (too narrow) |
| **Matching** | How gaps find their resolution | "Routing", "Dispatch" (too mechanical) |
| **Fallback** | Bramwell catches unmatched gaps | "Default handler" (too generic) |

**Key insight:** The metaphor of "matching" is intuitive—users think "this resolution handles gaps that look like X." Bramwell as "the human catchall" is a powerful, easy-to-remember concept.

---

## Gap-012: Actor Model

### New Concept Introduced

**Actor as Capable Worker with Identity**

Users must understand that actors are named entities with declared capabilities. The system routes work based on who can do it, with Bramwell as the always-present fallback.

### Leverageable Mental Models

- **Team Roles**: "The designer handles UI gaps, the backend dev handles API gaps, Bramwell handles everything else."
- **GitHub Teams/CODEOWNERS**: Assign work based on ownership and capability.
- **Capability-Based Security**: Actors hold capabilities that grant them work.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Actor** | A worker who can do things | "Agent" (overloaded), "Worker" (too generic) |
| **Capability** | What an actor can do | "Skill", "Permission" (wrong connotation) |
| **Bramwell** | The human catchall (proper name) | "Fallback handler" (loses personality) |

**Key insight:** Bramwell being a proper name rather than "the fallback" is brilliant for mental models. It humanizes the system and makes escalation feel like "asking the senior for help" rather than "hitting an error path."

---

## Gap-013: Loop Termination

### New Concept Introduced

**Stability as the Goal State**

Users must understand that the loop runs until "stable"—meaning no actionable gaps remain. This is fundamentally different from "run once and done." The system converges toward health.

### Leverageable Mental Models

- **React Reconciliation**: Keep diffing until the virtual DOM matches the desired state.
- **Kubernetes Controllers**: Reconcile until actual state matches desired state.
- **Fixed-Point Iteration**: Keep applying rules until nothing changes.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Stable State** | No more actionable gaps | "Quiescent", "Idle" (too CS-y) |
| **Reconciliation Loop** | The detect-fix-recheck cycle | "Main loop" (too generic) |
| **Termination Reason** | Why the loop stopped | "Exit code" (too Unix-y) |

**Key insight:** "Stable" is the right word—it implies balance, health, homeostasis. Users should think "the system is trying to become stable" rather than "the system is processing gaps."

---

## Gap-014: Escalation Semantics

### New Concept Introduced

**Escalation as Ownership Transfer**

Users must understand that escalation is not failure—it's delegation to a more capable actor (Bramwell). The gap isn't "unresolved," it's "handed off."

### Leverageable Mental Models

- **Support Ticket Escalation**: Tier 1 can't solve it, escalate to Tier 2.
- **Exception Bubbling**: When code can't handle an error, it throws to the caller.
- **Manager Approval**: Some decisions need human judgment.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Escalation** | Handing off to Bramwell | "Failure", "Abort" (too negative) |
| **Escalated** | Status: awaiting human action | "Pending", "Blocked" (wrong connotation) |
| **Work Order** | The artifact Bramwell receives | "Ticket", "Issue" (too tool-specific) |

**Key insight:** Escalation should feel like "asking for help," not "giving up." The status "escalated" is important—it's distinct from both "resolved" and "unresolved."

---

## Gap-015: Concurrency Model

### New Concept Introduced

**Swarm as Parallel Execution Mode**

Users must understand that the system can run in different modes: sequential (predictable, one thing at a time) or parallel/swarm (fast, many things at once). Concurrency is a dial, not a boolean.

### Leverageable Mental Models

- **Promise.all vs Sequential Await**: Users choose parallelism based on independence.
- **Effect-TS Fibers**: Lightweight concurrent processes with supervision.
- **Git Merge vs Rebase**: Parallel work with conflict detection/resolution.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Swarm Mode** | Multiple actors working in parallel | "Parallel mode" (too generic) |
| **Isolation** | Agents don't interfere with each other | "Sandboxing" (too security-focused) |
| **Conflict** | Two actors touched the same thing | "Collision", "Race condition" (too CS-y) |

**Key insight:** "Swarm" is evocative and matches the "elite mini-squad" metaphor. Users can visualize agents swarming over gaps like a coordinated team.

---

## Gap-016: Service Boundaries

### New Concept Introduced

**Engine as Composable Core with Pluggable Parts**

Users must understand that the engine provides orchestration but leaves domain concerns to them. It's a framework, not an application. "Pluggable" means they own the persistence, logging, and sinks.

### Leverageable Mental Models

- **Effect-TS Layers**: Provide services, compose with `Layer.provide()`.
- **Express Middleware**: Plug in your own handlers for cross-cutting concerns.
- **Dependency Injection Containers**: The engine needs services; you provide implementations.

### Vocabulary Recommendations

| Term | Intuition | Avoid |
|------|-----------|-------|
| **Engine** | The orchestration core | "Framework", "Library" (too generic) |
| **Sink** | Where outputs go (e.g., WorkOrderSink) | "Writer", "Output" (too generic) |
| **Layer** | A bundle of service implementations | "Module", "Plugin" (different semantics) |

**Key insight:** "Sink" is excellent for outputs (work orders flow into a sink). Layer is Effect vocabulary users already know. The "Engine provides / Caller provides" split is crucial for understanding the boundary.

---

## Synthesis

### Core Vocabulary (The ~7 Terms Users Must Know)

1. **Rule** - A declarative gap detector. "Rules see problems."
2. **Gap** - A detected drift between desired and actual state. "Gaps are what's wrong."
3. **Resolution** - A handler that closes gaps. "Resolutions fix problems."
4. **Actor** - A capable worker (human or AI) with declared abilities. "Actors do work."
5. **Bramwell** - The human catchall actor. "When in doubt, ask Bramwell."
6. **Escalation** - Handing a gap to a more capable actor. "Some gaps need humans."
7. **Stable State** - The goal: no actionable gaps remain. "The system wants to be stable."

Secondary terms (important but derivable):
- **Work Order** - Artifact created for escalated gaps
- **Capability** - What an actor can do
- **Loop/Reconciliation Loop** - The detect-fix-recheck cycle

### Conceptual Relationships

```
Rules ──detect──> Gaps ──matched to──> Resolutions
                    │                      │
                    │                      ├──> closes gap
                    │                      └──> escalates to Actor (Bramwell)
                    │
                    └── have identity (for deduplication & tracking)

Loop runs until: Stable State (no actionable gaps)
              or: All remaining gaps are escalated
              or: Max iterations / timeout

Actors have Capabilities that determine what Gaps they can handle
Bramwell is always-present Actor with "handle anything" capability
```

### Recommended Decisions from Mental Model Perspective

**Gap-009 (Rule API):**
- Recommend: Single context object pattern (like React props)
- Why: Simpler mental model than scattered parameters. "The rule gets context, returns gaps."

**Gap-010 (Gap Identity):**
- Recommend: Content-addressed identity (like git)
- Why: Users already understand "same content = same thing." Don't burden them with explicit IDs.

**Gap-011 (Resolution Matching):**
- Recommend: Type-based matching (`_tag`) as primary, with optional predicate refinement
- Why: Pattern matching is intuitive. "This resolution handles `MissingFileGap` gaps."

**Gap-012 (Actor Model):**
- Recommend: Actor as first-class concept with explicit capabilities
- Why: The team/squad metaphor is powerful. "Who can do this work?"
- Keep Bramwell as a named concept, not just "default fallback"

**Gap-013 (Loop Termination):**
- Recommend: "Stable" as the primary termination concept
- Why: Homeostasis is the core metaphor. The loop seeks stability.
- Termination reasons should map to user understanding: `Stable | MaxIterations | Timeout | Escalated`

**Gap-014 (Escalation):**
- Recommend: Three-state model: Unresolved → Resolved | Escalated
- Why: Escalation is not failure—it's successful delegation. Users need to see it as positive.

**Gap-015 (Concurrency):**
- Recommend: "Swarm mode" as the named parallel execution mode
- Why: Evocative, matches squad metaphor, distinguishes from generic "parallel"
- Sequential should be default for predictability; swarm is opt-in

**Gap-016 (Services):**
- Recommend: Clear "Engine provides / Caller provides / Pluggable with defaults" categorization
- Why: Users need to know what they MUST do vs what they CAN customize
- `Engine.Default` as zero-config starting point is essential for onboarding

### The Core Metaphor

**The system is a homeostatic organism seeking balance.**

- Rules are sensors (detect imbalance)
- Gaps are symptoms (what's wrong)
- Resolutions are responses (restore balance)
- Actors are organs (each has a role)
- Bramwell is the brain (handles what automation can't)
- Stable state is health (the goal)

This biological metaphor should inform all naming and documentation. It's intuitive, memorable, and accurately represents the system's purpose.
