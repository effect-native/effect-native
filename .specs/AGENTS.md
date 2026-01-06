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
  01-instructions-gaps.md     # Gaps in understanding intent/context
  01-instructions.md          # Only exists when gaps.md is resolved

  # Phase 2: Requirements
  02-requirements-gaps.md     # Gaps in requirements clarity
  02-requirements.md          # Only exists when gaps.md is resolved

  # Phase 3: Design
  03-design-gaps.md           # Gaps in technical design
  03-design.md                # Only exists when gaps.md is resolved

  # Phase 4: Plan
  04-plan-gaps.md             # Gaps in execution plan
  04-plan.md                  # Only exists when gaps.md is resolved

  # Phase 5: Implementation (no gaps file - just do the work)
```

### The Gap-Driven Rule

**RULE:** A phase artifact (e.g., `01-instructions.md`) may only exist when its corresponding gaps file (e.g., `01-instructions-gaps.md`) is fully resolved (empty or deleted).

This applies homeostatic reconciliation to the spec process itself:

1. **Identify gaps** - What questions/uncertainties exist?
2. **Resolve gaps** - Ask questions, get answers, update understanding
3. **Create artifact** - Only when zero gaps remain
4. **Proceed to next phase** - Which introduces new gaps to resolve

### INBOX.md

The inbox captures raw brain dumps before they're processed into gaps:

- Unstructured notes from conversations
- Ideas that haven't been categorized
- Questions that haven't been formalized as gaps

Process: INBOX.md → identify gaps → create gaps.md → resolve → create artifact

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

### Phase 5: Implementation (Coding)

**Objective:** Write code that satisfies the Design and passes the Requirements.

**No gaps file for this phase** - the plan.md checklist drives the work.

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

---

## 🔄 Gap Resolution Workflow

When working on any phase:

1. **Read the INBOX.md** (if exists) for raw context
2. **Create/update the gaps file** (e.g., `01-instructions-gaps.md`)
3. **For each gap:**
   - Ask the user for clarification
   - Record the answer
   - Mark the gap as resolved (strikethrough or delete)
4. **When all gaps are resolved:**
   - Delete or empty the gaps file
   - Create the phase artifact
   - Commit both changes together
5. **Request approval to proceed**

### Gap File Format

```markdown
# Phase N: [Phase Name] - Gaps

## Open Gaps

### Gap 1: [Short description]

**Question:** [The specific question or uncertainty]
**Context:** [Why this matters]
**Status:** Open

### Gap 2: [Short description]

**Question:** [The specific question or uncertainty]
**Context:** [Why this matters]
**Status:** Open

## Resolved Gaps

### ~~Gap 3: [Short description]~~

**Question:** [The specific question or uncertainty]
**Resolution:** [The answer/decision]
**Resolved:** [Date]
```

---

## 🛠️ General Repository Rules

1.  **Linting:** Immediately run the project's linter/formatter after editing any file.
2.  **Testing:** New features require new tests. Bug fixes require regression tests.
3.  **Types:** If the language is typed (e.g., TypeScript, Go, Rust), strict type safety is required. No `any` or equivalent bypasses unless absolutely necessary and documented.
4.  **Comments:** Code should be self-documenting. Use comments to explain _why_, not _what_.
