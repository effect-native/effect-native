---
id: product
title: repo-gaps product specification
status: spec
owners:
  - dev-team
created: 2026-01-08
files:
  - "!**/*"  # No impl files - this is product spec only
refs:
  - "@wrapper/research/thing-golf.md"
tags:
  - product
  - user-facing
---

# Intent

Provide an automated system that maintains living documentation tracking:

1. **Gaps** — discrepancies between what specs require and what implementations do
2. **QA items** — open questions, ambiguities, and concerns about specs themselves

The system enables spec-first development where:

- Specs are the source of truth for intended behavior
- Gaps are automatically identified and tracked
- Quality improves through continuous validation

# Glossary

- **Package**: A directory containing spec file(s) that describe intended behavior
- **Spec**: A behavioral specification document defining what something should do
- **Gap**: A discrepancy between what a spec requires and what the implementation does
- **QA Item**: An open question, ambiguity, or concern about a specification itself

# Scope

## In-scope

- Automatic gap detection when code changes
- Automatic spec QA when specs change
- Instant status check without network calls (`bun ok`)
- Manual analysis trigger (`bun update-gaps`)
- Cross-referencing gaps across different specs
- Tracking resolution status over time
- Badness scoring to prioritize work

## Explicit non-goals

- Blocking commits (must stay instant)
- Manual/interactive analysis modes
- Non-git version control support
- Automatic code fixes

# User Stories

## US1 — Check project health instantly

As a developer, I want to run `bun ok` and instantly see:

- How many gaps exist and their severity
- How many spec questions are open
- What's blocking what
- Overall health status

This must work offline and complete in <100ms.

## US2 — Gaps stay current with code

As a developer, when I push code changes, gaps are automatically re-analyzed so the remote always has accurate gap documentation.

## US3 — Separate concerns with multiple specs

As a developer, I want to maintain separate specs for different concerns (e.g., one for TypeScript logic, one for CSS styling) with each spec tracking its own gaps.

## US4 — Cross-reference related gaps

As a developer, I want to mark gaps as related or blocking each other, so I can understand dependencies and prioritize work effectively.

## US5 — Track spec quality

As a developer, when I write or modify specs, I want automatic identification of ambiguities, underspecified behaviors, and edge cases so I can improve spec quality.

## US6 — Reference external docs

As a developer, I want specs to reference external documentation (like style guides or scoring rubrics) that the AI considers during analysis.

## US7 — Submodule support

As a developer working in a public submodule, I want to reference private docs in the wrapper repo, with only the path string being visible (acceptable leak).

# Quality Attributes

## Instant feedback

- `bun ok` completes in <100ms
- No network calls for status checks
- Works fully offline

## Non-blocking workflow

- Commits remain instant (no hooks)
- Analysis runs on push (acceptable delay)
- Developer decides when to commit generated files

## Single source of truth

- No duplicate data (e.g., `blocked_by` derived from `blocks`)
- Specs define behavior, gaps track deviations
- Git history captures all changes

## Prioritization support

- Severity levels (critical/high/medium/low)
- Badness scoring across multiple dimensions
- Blocking relationships surface actionable items
