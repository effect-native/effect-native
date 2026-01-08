# Failure Experience Lens Analysis

**Core Question:** What happens when things go wrong? How do users experience and recover from failures?

**Users:** Tom (project owner), Bramwell (human fallback/catchall), AI agents (automated resolution)

---

## Gap-009: Rule API Shape

### What Can Go Wrong

1. **Rule author writes a malformed rule** - wrong signature, missing required fields, invalid return type
2. **Rule throws an exception at runtime** - uncaught error during rule evaluation
3. **Rule hangs or times out** - infinite loop, awaiting resource that never arrives
4. **Rule returns ambiguous results** - gaps that don't match expected shape, missing identity data
5. **Rule dependencies unavailable** - context/services the rule needs aren't provided

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| Malformed rule | **LOUD** - compile/load time | Rule author needs immediate feedback before running anything |
| Runtime exception | **LOUD** - fail the rule, continue loop | Other rules should still run; author needs to know which rule failed |
| Timeout | **LOUD** - mark rule as timed out | Operator needs to know something hung; loop should continue |
| Ambiguous results | **LOUD** - validation error | Better to fail fast than process garbage gaps |
| Missing dependencies | **LOUD** - fail at rule registration | Don't let rules into the system that can't run |

### Recovery Path

- **Malformed rule:** Fix the rule and reload. Type errors should point to exact problem.
- **Runtime exception:** Rule is skipped for this cycle; logs show stack trace; fix and re-run.
- **Timeout:** Rule times out, logged, loop continues. Operator can adjust timeout or fix rule.
- **Ambiguous results:** Gap validation fails, rule's output is discarded, rule author reviews logs.
- **Missing dependencies:** Rule fails to register; clear message about what's missing; provide deps.

---

## Gap-010: Gap Identity

### What Can Go Wrong

1. **Two distinct gaps get same identity** - false deduplication, only one gets resolved
2. **Same gap gets different identities** - duplicate work orders, wasted effort, noise
3. **Identity changes unexpectedly** - gap "disappears" and "reappears" as new gap
4. **Identity computation fails** - hash function error, missing required fields
5. **Identity collision across domains** - gap from rule A looks like gap from rule B

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| False deduplication | **Silent initially, LOUD when discovered** | Hard to detect automatically; surfaces when user notices missing work |
| Duplicate work orders | **Medium** - visible to Bramwell in queue | Bramwell sees dupes and knows something's wrong |
| Identity instability | **Medium** - visible in gap history | Tom/Bramwell notice "new" gaps that feel familiar |
| Identity computation fails | **LOUD** - gap rejected | Can't process gaps we can't identify |
| Cross-domain collision | **Silent until problematic** | Edge case; might never matter or cause subtle bugs |

### Recovery Path

- **False deduplication:** Hard to recover automatically. Bramwell notices missing resolution; investigation reveals dedup bug; fix identity logic, re-run.
- **Duplicate work orders:** Bramwell merges/closes dupes manually. System should track this and learn.
- **Identity instability:** Gap history shows "churn." Tom adjusts identity fields to be more stable.
- **Identity computation fails:** Gap is rejected with clear error showing which field is problematic.
- **Cross-domain collision:** When discovered, add namespace/rule-source to identity computation.

---

## Gap-011: Resolution Matching

### What Can Go Wrong

1. **No resolution matches a gap** - gap has nowhere to go (except Bramwell)
2. **Wrong resolution matches** - gap routed to handler that can't actually fix it
3. **Multiple resolutions match, wrong one wins** - priority/ordering problem
4. **Resolution crashes mid-execution** - partial fix, inconsistent state
5. **Resolution succeeds but gap persists** - resolution didn't actually fix the root cause

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| No match | **Expected path** - escalate to Bramwell | This is Bramwell's job; not really a "failure" |
| Wrong match | **Medium** - resolution fails or gap recurs | Surfaces when fix doesn't work |
| Priority error | **Silent until investigated** | Operator notices suboptimal routing over time |
| Resolution crash | **LOUD** - resolution marked failed | Gap owner needs to know attempt failed |
| False success | **Medium** - gap returns next cycle | Loop catches this; not silent but also not alarming |

### Recovery Path

- **No match:** Gap escalates to Bramwell. Bramwell resolves manually or adds new resolution.
- **Wrong match:** Resolution fails, gap re-enters pool. Operator adjusts matching criteria.
- **Priority error:** Review routing logs; adjust priority configuration.
- **Resolution crash:** Gap marked "resolution-failed," eligible for retry or escalation. Error logged.
- **False success:** Gap recurs next cycle. System should track recurrence and eventually escalate.

---

## Gap-012: Actor Model

### What Can Go Wrong

1. **No capable actor available** - capability required but nobody has it
2. **Actor becomes unavailable mid-work** - agent crashes, Bramwell goes offline
3. **Actor is overloaded** - too much work routed to one actor
4. **Capability mismatch** - actor claims capability but can't actually perform
5. **Bramwell unavailable** - the ultimate fallback is offline

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| No capable actor | **Expected** - routes to Bramwell | Design intent |
| Actor unavailable mid-work | **LOUD** - work orphaned or stuck | Someone needs to reassign |
| Actor overloaded | **Medium** - visible in queue depth | Operator should notice and rebalance |
| Capability mismatch | **Medium** - actor fails, work returns | Similar to resolution crash |
| Bramwell unavailable | **LOUD** - work queues with no handler | Critical: the catchall is gone |

### Recovery Path

- **No capable actor:** Bramwell handles it. Expected behavior.
- **Actor unavailable mid-work:** Work returns to pool, re-routed. May need manual intervention for partial work.
- **Actor overloaded:** Operator adds actors or adjusts routing. Temporary: work queues.
- **Capability mismatch:** Actor's failure triggers re-routing. Maybe demote actor's claimed capabilities.
- **Bramwell unavailable:** Work queues persistently. When Bramwell returns, queue is waiting. System should warn loudly that fallback is offline.

---

## Gap-013: Loop Termination

### What Can Go Wrong

1. **Infinite loop** - gaps keep appearing, never stable
2. **Loop terminates too early** - gaps remain but loop stops
3. **Loop terminates for wrong reason** - reported as "stable" but actually errored out
4. **Timeout during resolution** - loop killed mid-fix
5. **Crash loses loop state** - restart means re-doing work

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| Infinite loop | **LOUD** - max iterations hit | Operator needs to know loop didn't converge |
| Early termination | **Medium** - reported but subtle | Termination reason should be clear |
| Wrong reason | **LOUD** - lie about state is worse than crash | Must distinguish stable vs error vs timeout |
| Timeout mid-fix | **LOUD** - partial state dangerous | Operator needs to know what was interrupted |
| Crash loses state | **Medium** - work repeated | Annoying but recoverable; progress lost |

### Recovery Path

- **Infinite loop:** Loop exits at max iterations. Clear message: "Did not converge after N iterations. Remaining gaps: [list]." Bramwell investigates.
- **Early termination:** Review termination reason in output. Adjust termination conditions if wrong.
- **Wrong reason:** Must never happen by design. Termination always includes accurate reason code.
- **Timeout mid-fix:** State should be checkpointed. On restart, resume from checkpoint or re-evaluate.
- **Crash loses state:** Persist loop state periodically. On restart, load checkpoint if available.

---

## Gap-014: Escalation Semantics

### What Can Go Wrong

1. **Escalation fails to write** - work order sink unavailable
2. **Escalation writes but Bramwell never sees it** - notification failure
3. **Gap escalated but Bramwell can't understand it** - insufficient context in work order
4. **Bramwell resolves but gap recurs** - underlying issue not actually fixed
5. **Escalation storms** - too many escalations overwhelm Bramwell

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| Write failure | **LOUD** - escalation cannot silently fail | Gap must not disappear into void |
| Notification failure | **Medium** - work order exists but unseen | Bramwell eventually finds it; delay is the cost |
| Insufficient context | **Medium** - Bramwell frustrated | Bramwell asks for more info; feedback loop |
| Fix doesn't stick | **Medium** - gap recurs next cycle | System tracks recurrence; eventually re-escalates |
| Escalation storm | **LOUD** - Bramwell overwhelmed | Need rate limiting or aggregation |

### Recovery Path

- **Write failure:** Gap remains "unescalated." Retry escalation. If persistent, LOUD alert: "Cannot reach work order sink."
- **Notification failure:** Bramwell's problem to check work orders. System did its job.
- **Insufficient context:** Bramwell provides feedback; escalation template improved for next time.
- **Fix doesn't stick:** Gap re-detected, possibly re-escalated with note "previously escalated on [date]."
- **Escalation storm:** Aggregate related escalations. "5 gaps of type X in last hour" rather than 5 separate work orders.

---

## Gap-015: Concurrency Model

### What Can Go Wrong

1. **Race condition corrupts state** - two agents modify same file
2. **Deadlock** - agents waiting on each other
3. **One failure kills entire swarm** - cascade failure
4. **Resource exhaustion** - too many concurrent operations
5. **Partial completion** - some agents succeed, some fail, inconsistent result

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| Race condition | **LOUD** - corruption detected | Must not silently corrupt; fail fast |
| Deadlock | **LOUD** - timeout triggers | Operator sees stuck agents |
| Cascade failure | **LOUD** - unexpected mass failure | Operator needs to know and investigate |
| Resource exhaustion | **LOUD** - rate limit errors, OOM | System should self-limit; failures are obvious |
| Partial completion | **Medium** - some work done, some not | Loop continues; incomplete work re-evaluated next cycle |

### Recovery Path

- **Race condition:** Conflict detection aborts both operations. Retry sequentially or with locks.
- **Deadlock:** Timeout breaks deadlock. Agents retry or escalate.
- **Cascade failure:** Isolate failures. One agent crash shouldn't kill others. Investigate root cause.
- **Resource exhaustion:** Backoff and retry. Reduce concurrency. Alert operator.
- **Partial completion:** Next loop iteration picks up remaining work. Partial progress preserved.

---

## Gap-016: Service Boundaries

### What Can Go Wrong

1. **Required service not provided** - missing Layer dependency
2. **Service implementation buggy** - custom sink throws errors
3. **Service misconfigured** - wrong path, invalid credentials
4. **Service incompatible** - version mismatch, wrong interface
5. **Default service insufficient** - works for testing, fails in production

### Failure Experience

| Failure | Visibility | Rationale |
|---------|------------|-----------|
| Missing service | **LOUD** - fail at startup | Can't run without dependencies |
| Buggy implementation | **LOUD** - errors at runtime | Custom code, user's responsibility to fix |
| Misconfigured | **LOUD** - clear config error | Point user to what's wrong |
| Incompatible | **LOUD** - type error or runtime check | Must catch before causing damage |
| Default insufficient | **Medium** - works in dev, fails in prod | User realizes they need custom implementation |

### Recovery Path

- **Missing service:** Error message lists missing services. User provides Layer.
- **Buggy implementation:** Runtime error with stack trace. User fixes their code.
- **Misconfigured:** Config validation at startup. Clear message about what's wrong.
- **Incompatible:** Type check at compile time; version check at runtime if needed.
- **Default insufficient:** User implements custom service. Docs explain when defaults don't suffice.

---

# Synthesis

## Failure Categories

1. **Configuration Failures** - Missing services, wrong settings, incompatible layers
2. **Authoring Failures** - Bad rules, bad resolutions, malformed gaps
3. **Runtime Failures** - Crashes, timeouts, exceptions during execution
4. **Routing Failures** - Wrong actor, wrong resolution, no match
5. **State Failures** - Identity collisions, lost state, corruption
6. **Concurrency Failures** - Races, deadlocks, resource exhaustion
7. **Communication Failures** - Escalation write fails, notifications lost
8. **Convergence Failures** - Infinite loops, partial completion, false stability

## Failure Visibility Rules

### LOUD (immediate, blocking, impossible to miss)

- Configuration errors at startup
- Service unavailable (especially work order sink)
- State corruption detected
- Max iterations reached without convergence
- Bramwell (fallback) unavailable
- Escalation write failure

### MEDIUM (visible, logged, eventually noticed)

- Resolution mismatch (wrong handler picked)
- Actor overload
- Duplicate work orders
- Gap recurrence after "fix"
- Partial swarm completion

### SILENT (by design, expected, or low-impact)

- No resolution match (expected escalation path)
- No capable actor besides Bramwell (by design)
- Gap deduplication working as intended

### Anti-Pattern: Never Silent

These MUST never be silent:
- Gap disappearing without resolution or escalation
- Loop terminating with undisclosed errors
- Escalation failing without retry
- State corruption

## Recovery Patterns

### Pattern 1: Retry with Backoff
**When:** Transient failures (network, rate limits, temporary unavailability)
**Experience:** User sees "retrying..." then either success or escalation
**Example:** Work order write fails -> retry 3x -> if still failing, LOUD alert

### Pattern 2: Escalate to Bramwell
**When:** Automation can't handle it
**Experience:** Bramwell gets work order with full context
**Example:** No resolution matches -> create work order -> Bramwell handles manually

### Pattern 3: Skip and Continue
**When:** One component fails but others can proceed
**Experience:** Failure logged, loop continues, user informed at end
**Example:** Rule throws exception -> log it -> run remaining rules -> report which rules failed

### Pattern 4: Checkpoint and Resume
**When:** Long-running operations interrupted
**Experience:** On restart, work continues from last checkpoint
**Example:** Loop timeout mid-resolution -> checkpoint -> restart -> resume

### Pattern 5: Aggregate and Summarize
**When:** Many similar failures would create noise
**Experience:** User sees "5 gaps of type X failed" not 5 separate errors
**Example:** Escalation storm -> aggregate into single work order with count

### Pattern 6: Feedback Loop
**When:** Failure reveals missing capability
**Experience:** Manual resolution leads to automated improvement
**Example:** Bramwell resolves gap -> optionally adds new resolution rule -> future gaps auto-resolve

## Recommended Decisions

### From the Failure Experience Perspective:

1. **Escalation must be infallible from the user's perspective.** If the work order sink fails, the system must retry, queue, or alert loudly. A gap must NEVER silently disappear.

2. **Loop termination reason must be explicit and accurate.** "Stable" vs "max iterations" vs "error" vs "timeout" must be clearly distinguished. Lying about state is worse than crashing.

3. **Bramwell is special.** The fallback actor cannot be removed or disabled. If Bramwell goes offline, the system must queue work and alert loudly.

4. **Gap identity errors should surface as noise, not silence.** Duplicate work orders (too many identities) are annoying but recoverable. False deduplication (too few identities) loses work silently. Err toward more identities.

5. **Configuration failures fail fast and loud.** Don't let the engine start with missing services or invalid config. Fail at startup with clear messages.

6. **Concurrent failures must be isolated.** One agent crashing cannot cascade. Other agents continue. Partial progress is preserved.

7. **Recurrence is a signal, not just repetition.** If a gap keeps coming back after resolution, the system should track this and eventually re-escalate with context: "This gap has recurred 3 times."

8. **Escalation storms need aggregation.** When many gaps escalate at once, aggregate them for Bramwell. Don't flood the work order queue.

9. **Recovery paths should lead back to the loop.** Every failure mode should have a clear path that eventually returns to the reconciliation loop running normally. Document these paths for users.

10. **Failures are learning opportunities.** Track failure patterns over time. Frequent escalations of the same type = opportunity to add automation. Frequent resolution failures = opportunity to improve matching.
