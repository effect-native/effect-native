# Agent Instructions for Spec-Driven Development

## 🚨 HIGHEST PRIORITY RULES 🚨

### 1. The "Read-Only" Rule

**NEVER** modify the codebase (src/test files) until **Phase 5 (Implementation)**.

- Phases 1-4 are strictly for documentation and planning within the spec directory (e.g. `.specs/[feature-name]/` or `packages/[package-name]/SPEC/`).
- Premature coding leads to technical debt and architectural misalignment.

### 2. The "Authorization Gate" Protocol

**NEVER** proceed to the next phase without explicit user approval.

- **Stop** after completing a document.
- **Commit** all phase artifacts to git before requesting approval.
- **Present** the content to the user.
- **Wait** for "Proceed" or "Approved".
- **Commit** any refinements before moving to the next phase.

### 3. The "Single Source of Truth"

The spec directory (e.g. `.specs/[feature-name]/` or `packages/[package-name]/SPEC/`) is the source of truth.

- If the code contradicts the spec, the code is wrong (or the spec needs updating first).
- Do not rely on conversation memory; rely on the written documents.

### 4. The "Evidence-Based" Protocol

**NEVER** conclude a task without experimental evidence.

- All conclusions must be based on evidence that can be reliably reproduced by peer reviewers.
- Do not simply state "it works" or "task complete." You must provide the test output, CLI logs, or verification results that prove the conclusion.

---

## 📁 Spec Directory Structure

Each spec directory follows a gap-driven artifact model:

```
.specs/[feature-name]/
  INBOX.md                    # Raw brain dumps, unprocessed ideas

  # Phase 1: Instructions
  01-instructions.md          # Only exists when all phase-1 gaps resolved

  # Phase 2: Requirements
  02-requirements.md          # Only exists when all phase-2 gaps resolved

  # Phase 3: Design
  03-design.md                # Only exists when all phase-3 gaps resolved

  # Phase 4: Plan
  04-plan.md                  # Only exists when all phase-4 gaps resolved

  # Phase 5: Implementation
  05-implementation.md        # Progress log, completion evidence

  # Gaps (all phases) - a dependency graph
  gaps/
    gap-001-{slug}.md         # Each gap is a unique file
    gap-002-{slug}.md         # YAML frontmatter tracks dependencies
    gap-003-{slug}.md         # Work only possible on unblocked gaps
    ...
```

### The Gap-Driven Rule

**RULE:** A phase artifact (e.g., `01-instructions.md`) may only exist when all gaps for that phase are resolved.

This applies homeostatic reconciliation to the spec process itself:

1. **Identify gaps** - What questions/uncertainties exist?
2. **Build dependency graph** - Which gaps block which?
3. **Work unblocked gaps** - Only gaps with no open blockers can be worked
4. **Resolve and repeat** - Resolution may unblock other gaps
5. **Create artifact** - Only when all phase gaps are resolved

### INBOX.md

The inbox captures raw brain dumps before they're processed into gaps:

- Unstructured notes from conversations
- Ideas that haven't been categorized
- Questions that haven't been formalized as gaps

Process: INBOX.md → identify gaps → create gap files → resolve → create artifact

### The `gaps/` Directory

Gaps are a **dependency graph**, not a flat list. Each gap is a separate file with YAML frontmatter tracking relationships.

**Gap Distribution (Diamond Shape):**

- **Few high-level gaps** - Big picture questions (e.g., "What problem does this solve?")
- **More medium-level gaps** - Detailed questions that depend on high-level answers
- **Few low-level gaps** - Atomic implementation details, very specific

```
        ┌─────┐
       /   1   \        ← Few high-level gaps
      /─────────\
     /     5     \      ← More medium-level gaps
    /─────────────\
   /       3       \    ← Few low-level gaps
  └─────────────────┘
```

**Dependency Rules:**

- Each gap **exhaustively lists everything blocking it** in `blocked_by`
- A gap is **workable** only when all its blockers are resolved
- Resolving a gap may **unblock many others**
- Cycles are forbidden (would indicate confused thinking)

**Gap File Format:**

```yaml
---
id: gap-001
phase: 1  # instructions
status: open | resolved | cancelled
blocked_by:
  - gap-002
  - gap-003
resolved_by: "Answer or reference to decision"
resolved_date: 2026-01-06
---

# Gap: [Short descriptive title]

## Question

[The specific question or uncertainty]

## Context

[Why this matters, what depends on this answer]

## Resolution

[Empty until resolved, then contains the answer/decision]
```

---

## 📋 The 5-Phase Workflow

### Phase 1: Instructions (`01-instructions.md`)

**Objective:** Capture the raw intent, context, and high-level goals.

**Invariant:** Zero uncertainty about intent, context, and goals.

**Gap Examples:**

- "What is the primary problem being solved?"
- "Who is the target user?"
- "What is explicitly out of scope?"

**✅ CONTENT:**

- **Context:** Why are we doing this? What is the current state?
- **User Story:** As a [role], I want [feature], so that [benefit].
- **High-Level Goals:** Bullet points of desired outcomes.
- **Out of Scope:** Explicitly state what we are NOT doing.

**🛑 FORBIDDEN IN THIS PHASE:**

- **Technical Jargon:** Avoid specific function names or file paths unless they are part of the problem description.
- **Implementation Details:** Do not discuss _how_ to build it.
- **Atomic Requirements:** Do not write "The system shall..." statements yet.

---

### Phase 2: Requirements (`02-requirements.md`)

**Objective:** Translate intent into atomic, testable, and unambiguous statements using **EARS Notation**.

**Invariant:** Every requirement is unambiguous, testable, and traceable to instructions.

**Gap Examples:**

- "What does 'fast' mean? (needs metric)"
- "What happens when X fails?"
- "Is Y in scope or out of scope?"

**✅ CONTENT:**

- **Functional Requirements (FR):** What the system does.
- **Non-Functional Requirements (NFR):** Performance, security, reliability.
- **Constraints:** Tech stack limitations, legacy support.

**📝 EARS NOTATION (Mandatory for FRs):**
Use the **Easy Approach to Requirements Syntax** patterns. Format for readability - single line or multi-line are both fine:

1.  **Ubiquitous (Always):** `The <System> shall <Response>`
    - _Ex: The Logger shall write all events to stdout._
2.  **Event-Driven (When):** `When <Trigger>, the <System> shall <Response>`
    - _Ex: When the user clicks Save, the System shall validate the input._
    - _Also fine:_ **When** the user clicks Save  
      **Then** the System shall validate the input
3.  **State-Driven (While):** `While <State>, the <System> shall <Response>`
    - _Ex: While the connection is lost, the Client shall queue outgoing requests._
4.  **Unwanted Behavior (If):** `If <Trigger>, the <System> shall <Response>`
    - _Ex: If the API returns a 500 error, the System shall retry twice._
5.  **Optional Feature (Where):** `Where <Feature is included>, the <System> shall <Response>`
    - _Ex: Where the Pro license is active, the System shall enable export._

**🛑 FORBIDDEN IN THIS PHASE:**

- **Ambiguity:** Words like "fast", "easy", "user-friendly", "robust" (Use metrics instead: "under 200ms").
- **Implementation Specifics:** Do not dictate _which_ library or algorithm to use (that is Design).
- **Pseudo-code:** No code blocks.
- **Technical Implementation Details:** Do not specify exact commands, file paths, API calls, or service names. Requirements describe WHAT the system does for the user, not HOW it does it technically. For example:
  - WRONG: "The System shall run `npm view {package} --json`"
  - RIGHT: "The System shall check if the package name is available on the registry"
  - WRONG: "The System shall use service `com.npmjs.registry` and key `token`"
  - RIGHT: "The System shall securely cache authentication credentials"
  - WRONG: "The CLI shall use `CliApp.run` with proper layer composition"
  - RIGHT: "The CLI shall provide standard help and version flags"

---

### Phase 3: Design (`03-design.md`)

**Objective:** Define the technical architecture and implementation strategy.

**Invariant:** Every requirement has a clear technical approach; no hand-waving.

**Gap Examples:**

- "How does component X communicate with component Y?"
- "What is the error handling strategy for Z?"
- "What data model represents this concept?"

**✅ CONTENT:**

- **Data Models:** Type names and their fields (not full TypeScript syntax)
- **API Signatures:** Function names, inputs, outputs as prose or tables
- **Module Architecture:** File/folder structure, dependency relationships
- **Algorithms:** Plain English or numbered steps for complex logic
- **Error Handling Strategy:** Error categories and recovery approaches
- **Test Strategy:** What to test and how (unit vs integration)

**🛑 FORBIDDEN IN THIS PHASE:**

- **Code blocks:** No TypeScript, JavaScript, JSON, or any executable syntax
- **Full implementations:** Describe WHAT functions do, not HOW (no function bodies)
- **Copy-pasteable configs:** Describe package.json structure, don't write it out
- **Test implementations:** Describe test cases in prose, don't write test code
- **Vague Hand-waving:** Do not say "We will handle errors." Define _exactly_ how.
- **Scope Creep:** Do not add features not listed in `02-requirements.md`.

**💡 RULE OF THUMB:**
If it could be copy-pasted into a `.ts`, `.js`, or `.json` file and executed, it does NOT belong in design.md. Use prose, tables, bullet points, and diagrams instead.

---

### Phase 4: Plan (`04-plan.md`)

**Objective:** Create a step-by-step execution checklist using **Red-Green-Refactor TDD**.

**Invariant:** Every design element has an ordered implementation task; dependencies are explicit.

**Gap Examples:**

- "What order should these components be built?"
- "What is the verification step for this task?"
- "Does task B depend on task A?"

**✅ CONTENT:**

- **Phased Execution:** Break work into logical chunks (e.g., "Setup", "Core Logic", "API Layer").
- **Atomic Tasks:** Each task should be a single commit or PR.
- **Verification Steps:** For each task, define how to verify it (e.g., "Run `npm test`", "Check linter").
- **Dependency Order:** Ensure Task B implies Task A is done.

**🔴🟢🔵 TDD STRUCTURE (Mandatory):**
For each module/feature, structure tasks as:

1. **RED:** Write failing tests first, with minimal stub implementation that compiles but fails tests
2. **GREEN:** Implement just enough code to make tests pass
3. **REFACTOR:** Clean up if needed (optional step, only if code is messy)

Example task structure:

- B1. Write Slug.test.ts (RED) — tests fail
- B2. Implement Slug.ts (GREEN) — tests pass

**🛑 FORBIDDEN IN THIS PHASE:**

- **Time Estimates:** Do not estimate hours or days. Focus strictly on logical dependency and atomicity.
- **Design Decisions:** If you are deciding _how_ to do something here, go back to Phase 3.
- **New Requirements:** If you find a missing requirement, go back to Phase 2.
- **Implementation before tests:** Never write implementation code before the corresponding test exists.

---

### Phase 5: Implementation (`05-implementation.md`)

**Objective:** Write code that satisfies the Design and passes the Requirements.

**Invariant:** Every task is complete; every blocker is resolved or escalated.

**Gap Examples:**

- "Design assumed X but runtime shows Y"
- "Dependency Z doesn't support feature W"
- "Test reveals edge case not covered in requirements"
- "Build fails with unexpected error"

**✅ CONTENT:**

- **Code:** Writing source files.
- **Tests:** Writing and running tests.
- **Docs:** Updating JSDoc/Comments/README.

**🚨 MANDATORY LOOP:**
For every task in `04-plan.md`:

1.  **Write Code** (matching `03-design.md`).
2.  **Lint/Format** (Standard project linter).
3.  **Compile/Check Types** (if applicable).
4.  **Write/Run Tests** (Produce the experimental evidence).
5.  **Commit**.

**🛑 FORBIDDEN IN THIS PHASE:**

- **Deviating from Design:** If the design proves impossible, **STOP**. Update `03-design.md` first, get approval, then continue.
- **Skipping Verification:** Never tick a box in `04-plan.md` without running the verification step and showing the evidence.
- **Leaving Broken Builds:** The codebase must compile and pass tests at the end of every step.

**🚨 IMPLEMENTATION GAPS ARE THE MOST CRITICAL:**

Implementation is where reality clashes with plans. Phase 5 gaps are the most important because:

1. **Design assumptions fail** - What looked good on paper doesn't work in code
2. **Edge cases emerge** - Tests reveal scenarios nobody considered
3. **Dependencies surprise** - Libraries don't behave as documented
4. **Integration breaks** - Components don't compose as expected

When a gap is discovered during implementation:

1. **STOP** - Do not hack around it
2. **Create a gap file** in `gaps/` with full context and `phase: 5`
3. **Trace back** - Does this block on earlier phase gaps? Add to `blocked_by`
4. **Resolve or escalate** - Fix it properly or escalate to Tom/Bramwell
5. **Continue** only when the gap is resolved

**Implementation Gap Additional Fields:**

```yaml
---
id: gap-042
phase: 5  # implementation
status: open
blocked_by: []
task: "B3"  # Which plan.md task triggered this
---

# Gap: [Short description]

## Symptom

[What actually happened - error messages, unexpected behavior]

## Expected

[What should have happened per design]

## Root Cause

[Analysis of why - discovered during investigation]

## Resolution

[How it was fixed, or empty if still open]

## Trace Back

[Did this require updating design/requirements/instructions? List affected artifacts]
```

---

## 🔄 Gap Resolution Workflow

### Starting a Phase

1. **Read INBOX.md** (if exists) for raw context
2. **Identify gaps** - Create gap files in `gaps/` for each uncertainty
3. **Map dependencies** - For each gap, list what blocks it in `blocked_by`
4. **Find workable gaps** - Gaps with empty `blocked_by` or all blockers resolved

### Working a Gap

1. **Verify it's unblocked** - All `blocked_by` gaps must be resolved
2. **Investigate/ask questions** - Gather information to resolve
3. **Record resolution** - Update the gap file with answer/decision
4. **Update status** - Set `status: resolved` and `resolved_date`
5. **Check what's unblocked** - Other gaps may now be workable
6. **Commit** - Commit the resolved gap file

### Completing a Phase

1. **Verify all phase gaps resolved** - `status: resolved` for all `phase: N` gaps
2. **Create phase artifact** - Write the `0N-*.md` file
3. **Commit together** - Artifact creation is atomic with gap completion
4. **Request approval** - Wait for "Proceed" before next phase

### Gap Numbering

Use sequential IDs: `gap-001`, `gap-002`, etc. across all phases.
Include a slug for human readability: `gap-001-problem-statement.md`

### Checking Gap Status

To find workable gaps:

- Look for gaps where `status: open`
- And all gaps in `blocked_by` have `status: resolved`

To check phase completion:

- All gaps with `phase: N` must have `status: resolved`

---

## 🌲 Gaps Are Evergreen

**CRITICAL:** Gaps are not historical artifacts. They are living documents that reflect current reality.

### The Evergreen Principle

1. **Gaps can appear at any time** - New uncertainty? Create a gap file.
2. **Gaps can reopen** - Reality changed? Set `status: open` again.
3. **Gaps can be deleted** - No longer relevant? Delete the file.
4. **Specs change → gaps appear** - If requirements/design/plan changes, new gaps emerge.
5. **Implementation reveals gaps** - Code that doesn't match spec creates gaps.

### Gap Reconciliation

Regularly reconcile the gaps folder:

1. **Scan for stale gaps** - Is this still a real uncertainty? If not, delete it.
2. **Scan for missing gaps** - Is there uncertainty not captured? Create a gap file.
3. **Scan for wrong dependencies** - Do `blocked_by` relationships still hold?
4. **Scan for wrong status** - Is a "resolved" gap actually still open?

### Gaps Reflect Reality, Not History

```
WRONG: "We resolved this gap on Jan 6, so it stays resolved forever"
RIGHT: "This gap was resolved, but the design changed, so it's open again"

WRONG: "Keep the gap file for historical record"
RIGHT: "The gap no longer exists, delete the file (git has history)"

WRONG: "We're in phase 5, so no new phase 1 gaps can appear"
RIGHT: "Implementation revealed our instructions were wrong, new phase 1 gap"
```

### The Homeostatic Loop for Gaps

The gaps folder is itself subject to homeostatic reconciliation:

**Invariant:** Every real uncertainty has exactly one gap file. No gap file exists for non-uncertainties.

**Gaps about gaps:**

- Missing gap file for real uncertainty → create it
- Gap file for resolved/irrelevant uncertainty → delete it
- Wrong dependencies → update `blocked_by`
- Wrong phase → update `phase`

---

## 🛠️ General Repository Rules

1.  **Linting:** Immediately run the project's linter/formatter after editing any file.
2.  **Testing:** New features require new tests. Bug fixes require regression tests.
3.  **Types:** If the language is typed (e.g., TypeScript, Go, Rust), strict type safety is required. No `any` or equivalent bypasses unless absolutely necessary and documented.
4.  **Comments:** Code should be self-documenting. Use comments to explain _why_, not _what_.
