# Value Lens Analysis

**Core Question**: "Why does this matter to users? What outcomes/benefits does this deliver?"

**Users**: Tom (project owner), Bramwell (human fallback), AI agents (elite mini-squad)

---

## Gap 009: Rule API Shape

### What user value does this gap decision unlock?

**Rule authors can confidently create new rules without guesswork.** When the API shape is clear, Tom/Bramwell/agents spend time writing useful rules instead of reverse-engineering the expected contract. A well-defined rule API means:

- New rules get added quickly (velocity)
- Rules work correctly on first try (reliability)
- Rules can be tested in isolation (confidence)
- Rules compose predictably (extensibility)

The value is **reduced friction for growing the system's intelligence** over time.

### What would users lose if we got this wrong?

- **Ambiguous API**: Rule authors write code that compiles but fails at runtime. Debugging eats hours.
- **Too rigid**: Rules can't express nuanced invariants; users work around the system instead of with it.
- **Too loose**: No type safety; errors surface late; rules become fragile and hard to maintain.
- **Poor testing story**: Rules can't be validated without running the full engine, making iteration slow and uncertain.

**Worst case**: People stop writing rules because it's too frustrating. The system stagnates.

### Minimum viable decision that delivers value

**Define a typed function signature with Effect return type.** At minimum:

- Rule = function that takes context, returns `Effect<Gap[]>`
- Context is a single object (bag of dependencies)
- Rule has an `id` for logging/debugging

This is enough to write, test, and run rules. Composition, metadata, lifecycle hooks can come later.

---

## Gap 010: Gap Identity

### What user value does this gap decision unlock?

**Users can trust the system's view of reality.** Gap identity determines whether:

- The same violation is counted once or N times (noise vs signal)
- A fixed issue stays fixed or keeps reappearing (reliability)
- Work orders map to actual problems (actionability)
- Historical trends are meaningful (insight)

The value is **accurate, trustworthy gap tracking** that humans and agents can act on with confidence.

### What would users lose if we got this wrong?

- **Duplicate gaps**: Same issue creates multiple work orders; Bramwell wastes time triaging duplicates.
- **Lost identity across restarts**: Gap history vanishes; can't track chronic issues; no learning.
- **False deduplication**: Different issues merged into one; root causes obscured; fixes incomplete.
- **Opaque identity**: Can't debug why two gaps did/didn't match; system feels like a black box.

**Worst case**: Bramwell loses trust in gap reports and reverts to manual auditing.

### Minimum viable decision that delivers value

**Gap identity = deterministic hash of (type + key discriminating fields).** At minimum:

- Each gap type declares which fields contribute to identity
- Identity is computed automatically, stable across serialization
- Identity is human-inspectable (log-friendly format)

This enables deduplication, tracking, and work order linking. Sophisticated hash strategies can evolve.

---

## Gap 011: Resolution Matching

### What user value does this gap decision unlock?

**Gaps automatically route to the right handler.** Users don't manually assign every gap; the system:

- Picks the right resolution for each gap type
- Escalates to Bramwell when no automation exists
- Allows gradual automation (start manual, add resolutions over time)

The value is **progressive automation with human safety net** - the system handles what it can, humans handle the rest.

### What would users lose if we got this wrong?

- **Misrouted gaps**: Wrong resolution attempts wrong fix; creates new problems.
- **Silent drops**: Gap matches nothing and disappears; violations go unaddressed.
- **No escalation**: Gaps with no handler sit in limbo forever; Bramwell never sees them.
- **Rigid matching**: Can't add new resolutions without modifying existing ones; system ossifies.

**Worst case**: Gaps fall through cracks. Users lose confidence and bypass the system entirely.

### Minimum viable decision that delivers value

**Match by gap type (`_tag`) with explicit Bramwell fallback.** At minimum:

- Resolutions register for specific gap types
- If no resolution matches, escalate to Bramwell
- One resolution per type initially (no priority/competing handlers)

This ensures every gap is either handled or escalated. Multi-handler strategies can come later.

---

## Gap 012: Actor Model

### What user value does this gap decision unlock?

**Work goes to the right entity based on capability.** Users benefit from:

- AI handles routine work (speed, cost savings)
- Humans handle judgment calls (correctness, safety)
- Squad can grow by adding new actors
- Bramwell is always the backstop (nothing falls through)

The value is **appropriate work distribution** - machines do machine things, humans do human things.

### What would users lose if we got this wrong?

- **No capability matching**: Every gap goes to one actor; bottleneck or wrong-fit assignments.
- **Bramwell overload**: Too much escalates to human; defeats the purpose of automation.
- **Agent misassignment**: Code-review gap goes to documentation agent; wasted cycles.
- **Static roster**: Can't add new AI agents or collaborators without code changes.

**Worst case**: Work routing is so broken that manual assignment becomes the norm.

### Minimum viable decision that delivers value

**Actors are a list of (id, capabilities); routing selects first capable actor; Bramwell is hardcoded fallback.** At minimum:

- Actor = { id: string, capabilities: string[] }
- Gap declares required capability
- Engine finds first matching actor or escalates to Bramwell

This enables basic routing. Priority, load balancing, dynamic registration can follow.

---

## Gap 013: Loop Termination

### What user value does this gap decision unlock?

**Users know when reconciliation is "done" and can trust the result.** Clear termination means:

- Tom can run reconciliation and walk away (it will stop)
- Agents can report definitive outcomes (not "maybe stable")
- Runaway loops don't burn resources
- Interrupted runs can resume

The value is **predictable, bounded execution** that fits into workflows and budgets.

### What would users lose if we got this wrong?

- **Infinite loops**: System never stops; wastes compute; requires manual kill.
- **Premature stop**: System stops with active gaps still actionable; false "all clear".
- **No explanation**: Loop stopped but nobody knows why; hard to diagnose or trust.
- **No timeout**: Time-sensitive contexts (CI, meetings) get blocked by long-running loops.

**Worst case**: Reconciliation becomes a liability - unpredictable, uncontrollable, unusable in real workflows.

### Minimum viable decision that delivers value

**Terminate when (no new gaps) OR (only escalated gaps remain) OR (max iterations hit).** At minimum:

- Single pass mode for dry-run/inspection
- Iterative mode with configurable max iterations
- Termination reason recorded and surfaced
- Timeout enforcement

This gives users confidence and control. Resumption/checkpointing can come later.

---

## Gap 014: Escalation Semantics

### What user value does this gap decision unlock?

**Bramwell sees exactly what needs human judgment and can act efficiently.** Clear escalation means:

- Escalated gaps appear in work orders with full context
- Bramwell can prioritize human-required items
- Resolved escalations auto-close (clean queue)
- Loop terminates cleanly (escalation = "handled for now")

The value is **effective human-in-the-loop operation** without noise, confusion, or dropped items.

### What would users lose if we got this wrong?

- **Ambiguous status**: Is this gap resolved, escalated, or stuck? Nobody knows.
- **Insufficient context**: Bramwell gets a work order but has to re-diagnose from scratch.
- **Stale work orders**: Gap is fixed but work order lingers; queue is cluttered.
- **Silent failures**: Escalation fails (disk full, etc.) and gap disappears; violation unaddressed.

**Worst case**: Bramwell's work order queue becomes unreliable; reverts to manual scanning.

### Minimum viable decision that delivers value

**Escalation creates work order and marks gap as "escalated" (distinct from resolved/unresolved).** At minimum:

- Escalated = "awaiting human action" (loop can terminate)
- Work order contains: gap details, resolutions attempted, failure reasons
- Escalation failure = gap remains unresolved + failure logged

This gives Bramwell actionable items and clear system state. Auto-close, learning loops can follow.

---

## Gap 015: Concurrency Model

### What user value does this gap decision unlock?

**Reconciliation completes in reasonable time without corrupting state.** Proper concurrency means:

- Large sweeps don't take forever (parallel rule evaluation)
- Independent fixes apply simultaneously (parallel resolution)
- Concurrent work doesn't conflict (isolation)
- Rate limits are respected (external API safety)

The value is **fast, safe, controlled execution** whether running manually or in swarm mode.

### What would users lose if we got this wrong?

- **Sequential everything**: Big reconciliations take too long; users don't run them often enough.
- **Uncontrolled parallelism**: Rate limits blown; accounts suspended; external services angry.
- **Race conditions**: Concurrent resolutions corrupt files; system creates problems instead of fixing them.
- **Cascading failures**: One failure brings down entire concurrent operation; progress lost.

**Worst case**: Concurrency is so error-prone that users disable it, sacrificing speed for safety.

### Minimum viable decision that delivers value

**Sequential by default; opt-in parallelism with configurable limits.** At minimum:

- Rules run sequentially in manual/one-shot mode
- Parallelism available in swarm mode with max concurrency setting
- Resolutions run sequentially unless explicitly marked safe for concurrency
- One failure doesn't crash siblings

This prioritizes correctness. Sophisticated conflict detection, locking, visualization can follow.

---

## Gap 016: Service Boundaries

### What user value does this gap decision unlock?

**Users can start simple and grow sophisticated.** Clear boundaries mean:

- Zero-config bootstrap: works out of the box with sensible defaults
- Selective override: swap just the logger or just the persistence layer
- Test isolation: run full loop with in-memory services
- Clean extension: add new services without touching core

The value is **right-sized complexity** - simple when you need simple, powerful when you need power.

### What would users lose if we got this wrong?

- **Too many required services**: Can't start without extensive configuration; barrier to entry.
- **Monolithic defaults**: Can't swap one thing without swapping everything; inflexible.
- **No test harness**: Have to hit real filesystems/APIs to test; slow, flaky, expensive.
- **Leaky abstractions**: Service boundaries don't hold; upgrades break everything.

**Worst case**: Getting started is so hard that users give up before seeing value.

### Minimum viable decision that delivers value

**Engine exports work with zero required services; defaults are built-in and individually overridable.** At minimum:

- Default layers for: WorkOrderSink (filesystem), Logger (Effect built-in), Clock (real), GapStore (in-memory)
- Caller provides only: Rules, Gap types, Resolutions
- Test mode: all services swapped to in-memory versions

This lets users start immediately. Service granularity, external observability, production persistence can evolve.

---

## Synthesis: Value-Driven Recommendations

### Priority Order (by user value unlocked)

| Rank | Gap | Why This Order |
|------|-----|----------------|
| 1 | **016 Service Boundaries** | Enables getting started. No value delivered until users can run the engine. |
| 2 | **009 Rule API Shape** | Enables writing rules. Can't detect gaps without rules. |
| 3 | **010 Gap Identity** | Enables trusting results. Without identity, gap tracking is noise. |
| 4 | **014 Escalation Semantics** | Enables human fallback. Bramwell is the safety net; must work reliably. |
| 5 | **013 Loop Termination** | Enables predictable operation. Users need to know when it's done. |
| 6 | **011 Resolution Matching** | Enables automation. Once gaps are trustworthy, route them to handlers. |
| 7 | **012 Actor Model** | Enables squad growth. Once routing works, optimize who handles what. |
| 8 | **015 Concurrency** | Enables scale. Sequential works first; parallel is optimization. |

### Recommended Decisions (Value Lens)

| Gap | Recommendation | Rationale |
|-----|----------------|-----------|
| **009** | Typed function: `(context) => Effect<Gap[]>` with rule ID | Minimum contract for rule authoring; testable in isolation |
| **010** | Hash of type + declared key fields | Deterministic, inspectable, enables all identity-dependent features |
| **011** | Match by `_tag` with mandatory Bramwell fallback | Simple dispatch; nothing drops; extensible later |
| **012** | Actor = { id, capabilities[] }; first-match routing | Enables basic capability matching; Bramwell always catches |
| **013** | Terminate on stable OR max iterations; record reason | Bounded execution; clear outcome; fits workflows |
| **014** | Escalated = distinct status; work order with full context | Clean semantics; actionable for Bramwell; loop terminates cleanly |
| **015** | Sequential default; opt-in parallel with limits | Safety first; speed available when proven safe |
| **016** | Zero required services; built-in defaults; override per-service | Lowest barrier to start; grow complexity as needed |

### Key Value Insight

The highest user value comes from **making the system usable before making it powerful**. Every decision should ask: "Does this help someone run their first reconciliation loop?" Only after that base works should we optimize for advanced scenarios (swarms, custom persistence, sophisticated routing).

The elite mini-squad (Tom, Bramwell, agents) needs a system that **works reliably with minimal setup** and **grows capabilities over time**. Getting fancy on day one defeats the value proposition.
