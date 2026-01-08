---
id: gap-009
phase: 2
status: resolved
blocked_by: []
resolved_date: 2026-01-07
---

# Gap: Rule API Shape

## Question

What is the exact API shape for defining a rule? The INBOX shows a sketch, but requirements need precision:

- Does a rule take a context object, or individual parameters?
- What type parameters does Rule have?
- Is there a Rule interface/class, or just a function type?

## Context

Requirements must be unambiguous. "Rules produce gaps" needs to specify exactly how.

## User Stories & Jobs To Be Done

### Rule Authors (Tom, Bramwell, Agents)

**Writing new rules:**
- As a rule author, I need a clear type signature so I know exactly what to implement
- As a rule author, I need to understand what context/dependencies are available when my rule runs
- As a rule author, I need to return gaps in a predictable shape so the engine can process them
- As a rule author, I need error handling patterns (what if my rule fails vs finding no gaps?)

**Iterating on rules:**
- As a rule author, I need to test my rule in isolation without spinning up the full engine
- As a rule author, I need to see clear type errors when my rule doesn't conform to the API
- As a rule author, I need examples/templates to copy from when creating new rules

### Rule Consumers (The Engine)

**Executing rules:**
- As the engine, I need to invoke rules uniformly regardless of what they check
- As the engine, I need rules to declare their dependencies so I can provide context
- As the engine, I need to handle rule failures gracefully (timeout, exception, etc.)

**Scheduling & orchestration:**
- As the engine, I need to know if rules can run in parallel or have ordering constraints
- As the engine, I need rules to be Effect-native so I can leverage fiber supervision

### Debugging & Observability

- As a debugger, I need rules to have identifiers/names for logging and tracing
- As a debugger, I need to understand why a rule produced (or didn't produce) specific gaps
- As a debugger, I need timing/performance data for rule execution

### Composability

- As a rule author, I need to compose smaller rules into larger ones (rule combinators?)
- As a rule author, I need to conditionally enable/disable rules without code changes
- As a rule author, I need to parameterize rules (same logic, different thresholds)

### Testing

- As a tester, I need to mock rule dependencies to test in isolation
- As a tester, I need to verify a rule produces expected gaps for given inputs
- As a tester, I need to assert rules are pure/deterministic for the same context

### Key Questions These Stories Raise

1. **Context injection**: Single context object vs dependency injection vs Effect service pattern?
2. **Return type**: `Effect<Gap[]>` vs `Effect<void>` with gap emission vs Stream?
3. **Rule identity**: String ID? Tagged type? Path-based naming?
4. **Metadata**: Where do rule descriptions, tags, severity live?
5. **Lifecycle hooks**: beforeRun/afterRun? Or just the check function?

## Resolution

**STATUS: RESOLVED** (2026-01-07, via 5-lens analysis)

**Decision: Rules are typed functions returning Effect<Gap[]>**

- **Signature**: `(context: Context) => Effect.Effect<Gap[], RuleError, R>`
- **Identity**: String-based rule ID for logging/debugging
- **Context**: Single object containing all dependencies
- **No v0 features**: combinators, lifecycle hooks, runtime parameterization

**Rationale**:
- Value: Enables confident rule authoring, testable in isolation
- Mental Model: Matches lint rules users already understand
- Constraints: Simplest viable contract, no YAGNI features
- Failure: Type errors surface at compile time
- Progressive: Copy-paste to start, enhance later

See: `.specs/gaps/analysis/RECONCILED-REQUIREMENTS.md`
