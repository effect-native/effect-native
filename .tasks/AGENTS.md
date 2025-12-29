# Task System for Agents

## Directory Structure

```
.tasks/
  GOAL-*.md              # High-level objectives (active goals at root)
  done/                  # Archived completed GOALs
  research/              # Exploration, documentation, learning
  experiment/            # POCs, spikes, prototypes (no TDD required)
  spec/                  # Test specifications (Red phase)
  impl/                  # Implementation code (Green phase)
  cleanup/               # Refactoring tasks (Refactor phase)
  qa/                    # Manual QA tasks for Bramwell
```

## Task Categories

| Category | Location | Purpose | TDD Phase |
|----------|----------|---------|-----------|
| GOAL | `.tasks/GOAL-*.md` | Major milestones (active) | - |
| Done | `.tasks/done/GOAL-*.md` | Archived completed GOALs | - |
| Research | `.tasks/research/*.md` | Exploration, inventories, docs | - |
| Experiment | `.tasks/experiment/*.md` | POCs, spikes, prototypes | - |
| Spec | `.tasks/spec/*.md` | Test specifications | Red |
| Impl | `.tasks/impl/*.md` | Implementation work | Green |
| Cleanup | `.tasks/cleanup/*.md` | Refactoring, polish | Refactor |
| QA | `.tasks/qa/*.md` | Manual QA for Bramwell | - |

## RGRTDD Workflow

Proper implementation follows Red-Green-Refactor TDD:

1. **Experiment** (optional): Quick exploration in `.tasks/experiment/`
   - No TDD required
   - Throwaway code, learning-focused
   - Creates knowledge for spec phase

2. **Red Phase**: Spec in `.tasks/spec/*.md`
   - Write failing tests first
   - Tests define expected behavior
   - Implementation is BLOCKED until spec exists

3. **Green Phase**: Impl in `.tasks/impl/*.md`
   - `blocked_by` must include the spec task
   - Minimal code to make tests pass
   - No gold-plating

4. **Refactor Phase**: Cleanup in `.tasks/cleanup/*.md`
   - `blocked_by` must include the impl task
   - Improve code quality, tests still pass
   - Extract patterns, reduce duplication

## Status Field

Status must include the **basis** for the conclusion:

```yaml
status: complete
basis: |
  - All tests pass (poc/shadcn-button.test.ts)
  - Artifact exists and works (src/bridge/node-map.ts)
  - Verified by running: bun run poc/shadcn/button.ts
```

Valid status values:
- `pending` - Not started
- `in_progress` - Currently being worked on
- `complete` - Done, with basis explaining why
- `blocked` - Waiting on dependencies
- `poc-complete` - Experiment/POC done, not production-ready

## YAML Frontmatter

```yaml
---
title: Short description
status: pending | in_progress | complete | blocked | poc-complete
done_when: bun test src/thing.test.ts  # Command that returns 0 when done
basis: |
  Explanation of how status was determined.
  Include test results, artifact paths, verification commands.
blocked_by:
  - .tasks/done/GOAL-100.md
  - .tasks/spec/feature-name.md
artifacts:
  - path: src/thing.ts
    description: What it does
---
```

## Definition of Done (`done_when`)

Each task should include a `done_when` field that allows peer reviewers to independently verify completion.

### For code/test tasks (preferred)

A bash command that returns exit code 0 when done, non-zero when incomplete:

```yaml
# Test suite passes
done_when: bun test src/bridge/node-map.test.ts

# Script runs without error
done_when: bun run poc/goal-100.ts

# Build succeeds
done_when: bun build src/index.ts

# Multiple checks (all must pass)
done_when: bun test && bun run typecheck
```

### For documentation/research tasks

A human-readable instruction pointing to verifiable output:

```yaml
# Documentation exists with specific content
done_when: |
  see .research/happy-dom/api-inventory.md
  verify: contains "MutationObserver" section with "VERIFIED" status

# Artifact exists with expected structure
done_when: |
  see poc/tailwind-to-tui/mapper.ts
  verify: exports `tailwindToTui` function

# Decision documented
done_when: |
  see .research/react-dom/approach-comparison.md
  verify: contains "Recommendation" section with clear verdict
```

### For GOALs (compound verification)

GOALs often combine multiple subtasks:

```yaml
done_when: |
  all subtasks complete:
  - bun test src/bridge/*.test.ts
  - bun run poc/shadcn/button.ts
  - bun run poc/shadcn/card.ts
  see .tasks/impl/*.md for individual task status
```

### Why `done_when` matters

1. **Reproducibility** - Anyone can verify completion independently
2. **CI/CD ready** - Bash commands can run in automation
3. **Clear scope** - Prevents scope creep by defining exact completion criteria
4. **Trust** - Reviewers don't need to trust the agent's `status: complete` claim

## Path Convention

**All paths in `.tasks/**/*.md` files are relative to the project root** (parent of `.tasks/`).

This means:
- `blocked_by` entries start with `.tasks/`
- `artifacts` paths start with `src/`, `poc/`, `.research/`, etc.
- Never use `../` - all paths are from project root

Examples:
```yaml
# In .tasks/impl/my-feature.md
blocked_by:
  - .tasks/spec/my-feature.md      # Good: from project root
  - .tasks/done/GOAL-200.md             # Good: from project root
  - ../spec/my-feature.md          # Bad: relative path

artifacts:
  - path: src/bridge/my-feature.ts # Good: from project root
  - path: poc/demos/my-demo.ts     # Good: from project root
  - path: ../../src/thing.ts       # Bad: relative path
```

## Rules

1. **Only GOAL-*.md at root** - All other tasks go in category subfolders.

2. **All artifacts must link to a task** - Every file created must be tracked with an `artifacts:` entry.

3. **Add blockers as you go** - When you discover dependencies, add them to `blocked_by:`.

4. **Impl blocked by Spec** - Implementation tasks must have a spec task in `blocked_by`.

5. **Update status with basis** - When marking complete, explain WHY it's complete.

6. **Git commit as you go** - Commit after completing each task or significant progress.

7. **Own your workspace** - Create folders for your work. Don't modify other agents' files.

8. **No `/tmp`** - Use `.tmp/` in project root if needed.

## Archiving Completed GOALs

**IMPORTANT: Only Tom (the project owner) may archive GOALs.**

Agents may mark subtasks as complete, but GOALs require human sign-off. Tom is the final decider of what "done" means for major milestones.

### For Agents

When you believe a GOAL is complete:

1. **Update the GOAL's status to `complete`** with a thorough `basis` explaining why
2. **Ensure `done_when` criteria pass** - run the verification commands
3. **Notify Tom** - leave the GOAL in `.tasks/` for his review
4. **Do NOT move to `done/`** - that's Tom's call

### For Tom (Project Owner)

When archiving a completed GOAL:

1. **Commit all pending changes first** - The GOAL file must be clean before archiving.

2. **Archive with atomic git mv** - Move to `.tasks/done/` in a dedicated commit:
   ```bash
   git mv .tasks/GOAL-100.md .tasks/done/GOAL-100.md
   git commit -m "archive: GOAL-100 complete"
   ```

3. **Do NOT modify the file during the move** - The archive commit should only contain the rename, no content changes. This keeps history clean and makes it easy to see the final state.

4. **Update references** - Other tasks that had `blocked_by: .tasks/GOAL-100.md` should update to `.tasks/done/GOAL-100.md` (or remove the blocker if it no longer matters).

**Why archive GOALs but not other tasks?**
- GOALs represent major milestones worth preserving
- Research/experiment/impl tasks are supporting work - leave them in place
- Archiving keeps the root `.tasks/` clean and focused on active work
- Human sign-off ensures quality gates are actually met

## Artifact Paths

Paths are relative to project root (see Path Convention above):
```yaml
artifacts:
  - path: src/bridge/thing.ts
    description: DOM-to-Renderable bidirectional mapping
  - path: poc/shadcn/button.ts
    description: Demo of Button component rendering
```

## Concurrency

Multiple agents work in parallel. Avoid conflicts:
- Each agent owns specific task files
- Don't edit files another agent created
- Coordinate via `blocked_by` dependencies
- Check for conflicts before writing

## QA Tasks for Bramwell

QA tasks go in `.tasks/qa/` and are assigned to **Bramwell** (the human concierge assistant).

### What Bramwell is Good At

Bramwell excels at tasks that **cannot be automated**:

1. **Qualitative evaluation** – Is this API intuitive? Do these tests make sense? Is the UX good?
2. **Hypothesis invalidation** – Attempt to disprove that tests are valid/useful/complete
3. **Manual interactive testing** – Run demos, click around, try to break things
4. **Subjective judgment** – Does this look right? Feel right? Match conventions?

### What Bramwell Should NOT Do

**Never** create QA tasks for things that can be automated:

- ❌ "Run `bun test` and verify tests pass" – CI does this
- ❌ "Run `bun build` and check for errors" – CI does this
- ❌ "Verify the package exports X" – Write a test for this

### When to Create QA Tasks

Create QA tasks when:
- **Test quality review** – Are the tests testing the RIGHT things? Would they catch real bugs?
- **API design review** – Does the API follow conventions? Is it intuitive?
- **Manual UX testing** – Interactive demos that require human judgment
- **Visual verification** – Does it look right at different sizes/themes?
- **Accessibility testing** – Can a human navigate with keyboard only?

### QA Task Template

```yaml
---
title: "QA: <what Bramwell is evaluating>"
status: pending
assigned_to: Bramwell
blocked_by:
  - .tasks/impl/related-impl.md
done_when: |
  Bramwell has provided qualitative feedback:
  - <specific evaluation criterion>
  - <specific evaluation criterion>
  Evidence: written evaluation with specific examples
---

# QA: <What to Evaluate>

Bramwell, please <evaluate/review/test> X and attempt to invalidate the hypothesis that <claim we're testing>.

## Hypothesis to Invalidate

"<The claim we believe to be true that Bramwell should try to disprove>"

## Steps

1. <what to look at>
2. <what questions to ask>
3. ...

## Questions to Answer

1. <specific question requiring judgment>
2. <specific question requiring judgment>

## Context

High-Level Goal: <why this matters>
Motivation: <user/business value>
Obstacle: <why automation can't do this>

## Response Options

- Reject – "<hypothesis disproven because...>" + specific examples
- Pass – "<hypothesis holds>" + brief justification
- Pass with issues – "<mostly valid but...>" + prioritized list of concerns
```

### Rules for QA Tasks

1. **No automatable work** – If it can be a test or CI check, don't give it to Bramwell
2. **Hypothesis-driven** – Frame tasks as "try to disprove X" not "verify X works"
3. **Qualitative focus** – Ask for judgment, evaluation, comparison, not pass/fail
4. **Atomic scope** – One evaluation per task; Bramwell has limited executive function
5. **Evidence required** – Pass/fail must include written reasoning with specific examples

### Reference

See `work/TinkerBot/TinkerBot/projects/Bramwell.md` for Bramwell's full capabilities and limitations.

## Migration Notes

Legacy tasks in `.tasks/dev/` should be treated as `.tasks/impl/` until migrated.
Legacy research tasks at `.tasks/*.md` root should be treated as `.tasks/research/`.

## Path Updates After Archiving

When a GOAL moves to `done/`, update `blocked_by` references in other files:

```yaml
# Before archiving GOAL-100
blocked_by:
  - .tasks/GOAL-100.md

# After archiving (if dependency still relevant)
blocked_by:
  - .tasks/done/GOAL-100.md

# Or remove if no longer needed as blocker
blocked_by: []
```
