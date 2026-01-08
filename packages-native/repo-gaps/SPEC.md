---
id: work-order.repo-gaps
title: AI-powered spec/implementation gap analysis via git hooks
status: spec
owners:
  - dev-team
created: 2026-01-08
principles:
  - spec-first-development
  - continuous-validation
  - automatic-documentation
  - non-blocking
  - instant-feedback
---

# Intent

Provide an automated system that maintains living documentation tracking:
1. **`.gaps/`** — discrepancies between a package's SPEC.md and its implementation
2. **`.qa/`** — open questions, ambiguities, and concerns about the spec itself

The system:
- Hooks into git's post-commit workflow for AI-powered analysis
- Stores findings as individual files with YAML frontmatter for instant querying
- Provides `bun ok` command for immediate status without LLM calls

# Glossary

- **Package**: A directory containing spec file(s) that describe intended behavior
- **Spec**: Either a single `SPEC.md` or multiple `.specs/*/SPEC.md` files
- **Gap**: A discrepancy between what a spec requires and what the implementation does
- **QA Item**: An open question, ambiguity, or concern about a specification itself
- **Frontmatter**: YAML metadata at the top of markdown files, parsed via `Bun.YAML`

# Scope

## In-scope

- **Pre-push hook** that triggers gap analysis (commits stay cheap and fast)
- AI-powered comparison of SPEC.md to implementation files
- AI-powered review of SPEC.md for ambiguities and open questions
- Individual files per gap/QA item with structured YAML frontmatter
- `bun ok` command for instant status display (no LLM)
- Tracking resolved vs open items across runs (preserving IDs)
- Auto-committing generated documentation before push completes
- Blocking push until gaps are updated (ensures remote always has current analysis)

## Explicit non-goals

- Post-commit hooks (commits must be instant)
- Pre-commit hooks (same reason)
- Manual/interactive analysis modes
- Support for non-git version control

# End-State Behaviors

## B1 — Instant status via `bun ok` (no AI, no network)

Running `bun ok` in a package directory instantly displays:
- Count of open vs resolved gaps per spec
- Count of open vs resolved QA items per spec
- List of critical/high severity open items
- Cross-spec dependency graph (what's blocked, what's blocking)
- Newly actionable gaps (blockers recently resolved)
- Overall health indicator

**Entirely local operation:**
- Reads `.ok/rules/*/SPEC.md` frontmatter
- Reads `.ok/rules/*/*.gap.md` frontmatter
- Reads `.ok/rules/*/SPEC.QA.md` frontmatter
- Parses YAML via `Bun.YAML` (built-in, no deps)
- Zero network calls, zero AI calls

Observable:
- Command completes in <100ms
- Works offline
- Color-coded output (red for critical, yellow for open, green for resolved)
- Shows cross-spec relationships from `related`/`blocks`/`blocked_by` fields

## B2 — Structured gap files with cross-references

Each gap is stored as `*.gap.md` with YAML frontmatter:

```yaml
---
id: missing-env-var
title: Short description of the gap
status: open | resolved
severity: critical | high | medium | low
category: security | correctness | ux | informational
spec_section: B3
impl_location: src/cli.ts:34
created: 2026-01-08
resolved_at: null
resolved_in: null
resolved_reason: null
# Cross-references (single source of truth - no blocked_by, derive it)
related:
  - auth/session-validation      # gap id in auth spec
  - styling/contrast-ratio       # gap id in styling spec
blocks:
  - billing/payment-flow         # this gap blocks another (blocked_by is derived)
# ThingBadness scoring (see @work/cr-sqlite/cr-sqlite/research/thing-golf.md)
badness:
  safety: 0        # 0=safe, +N=explosive
  burden: 0        # -N=lighter, +N=heavier
  chaos: 0         # -N=clearer, +N=chaotic
  betrayal: 0      # 0=trustworthy, +N=betraying
  control: 0       # -N=freer, +N=control-freak
---

## Description

Detailed explanation of the gap...

## Spec Says

Quote from spec...

## Implementation Does

What the code actually does...
```

**Cross-reference format:** `{spec-name}/{gap-id}` or just `{gap-id}` for same spec.

**Single source of truth:** Only `blocks` is stored. `blocked_by` is derived at read time by inverting the graph. This avoids staleness debt from duplicate data.

**ThingBadness scoring** (per @work/cr-sqlite/cr-sqlite/research/thing-golf.md):
- `safety`: 0=safe, +N=explosive (attacks certainty)
- `burden`: -N=lighter, +N=heavier (attacks freedom)
- `chaos`: -N=clearer, +N=chaotic (attacks certainty)
- `betrayal`: 0=trustworthy, +N=betraying (attacks trust)
- `control`: -N=freer, +N=control-freak (attacks autonomy)

Total badness = weighted sum. Higher is worse. `bun ok` sorts by badness.

Observable:
- Gaps declare `related` and `blocks` only
- `bun ok` derives `blocked_by` by graph inversion
- `bun ok` computes total badness and sorts gaps by it
- Resolving a blocking gap surfaces blocked gaps as actionable

Observable:
- Each gap has its own file
- Files can be edited manually or by AI
- Frontmatter parseable via `Bun.YAML.parse()`
- Git history shows per-gap changes

## B3 — Structured QA files

Each QA item is stored as `.qa/QA-{N}.md` with YAML frontmatter:

```yaml
---
id: QA-1
title: Short description of the question/concern
status: open | resolved
category: ambiguity | underspecified | edge-case | contradiction
spec_section: B4
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The specific question or concern...

## Context

Why this matters...

## Suggested Resolution

How the spec could address this...
```

## B4 — AI updates individual files

Before each push, the AI:
1. Reads existing `.gaps/*.md` and `.qa/*.md` files
2. Identifies which items are now resolved (updates frontmatter)
3. Creates new files for newly discovered items
4. Does NOT delete files (resolved items remain for history)

Observable:
- New gaps appear as new files
- Resolved gaps have `status: resolved` in frontmatter
- GAP/QA IDs are never reused

## B5 — Pre-push blocking with auto-commit

The pre-push hook:
1. Runs AI analysis on all packages with changes since last push
2. Creates/updates gap and QA files
3. Auto-commits changes with `[auto]` prefix
4. Amends the auto-commit into the push (or creates new commit)
5. Only then allows push to proceed

Observable:
- `git push` blocks until analysis completes
- `git commit` remains instant (no hooks)
- Remote always has up-to-date gap analysis
- Auto-commits are marked `[auto]` to identify them

## B6 — Hook discovery via directory walking

When a push includes changes to files within a package, the system finds all `.ok/` directories by walking up the directory tree from each changed file.

## B7 — Graceful handling of missing files

- No specs found → skip analysis
- No existing `.gaps/` → create directory and initial gaps
- No existing `.qa/` → create directory and initial QA items
- No implementation files → analyze spec only

## B8 — Tight locality under .ok/rules/

All specs, gaps, and QA items live together under `.ok/rules/` for tight locality:

```
package/
├── src/                     # Implementation
└── .ok/
    ├── hooks/
    │   └── pre-push
    ├── push.log
    └── rules/
        ├── auth/
        │   ├── SPEC.md      # The spec
        │   ├── SPEC.QA.md   # QA for the spec
        │   ├── no-env-var.gap.md
        │   └── missing-exit-codes.gap.md
        ├── styling/
        │   ├── SPEC.md
        │   ├── SPEC.QA.md
        │   └── contrast-ratio.gap.md
        └── default/         # For packages with single SPEC.md at root
            ├── SPEC.md      # (symlink or copy from root)
            ├── SPEC.QA.md
            └── *.gap.md
```

**Naming conventions:**
- `SPEC.md` — the behavioral specification
- `SPEC.QA.md` — open questions about the spec
- `*.gap.md` — individual gaps (kebab-case slug as filename)

Observable:
- Everything related to a spec is in one directory
- Easy to see all gaps for a spec at a glance
- `bun ok` walks `.ok/rules/*/` to find all specs
- Gap filenames are slugified from title (e.g., "Missing env var" → `missing-env-var.gap.md`)

## B9 — Spec frontmatter with file targeting

Each SPEC.md has YAML frontmatter that defines metadata and scopes the spec to relevant files:

```yaml
---
id: feature-name
title: Human readable title
status: draft | spec | stable | deprecated
owners:
  - team-or-person
created: 2026-01-08
files:
  - "src/**/*.ts"           # Glob patterns for relevant implementation
  - "!src/**/*.test.ts"     # Negation patterns supported
  - "styles/**/*.css"
refs:
  # Repo-relative paths to reference docs (AI reads these for context)
  - "@work/cr-sqlite/cr-sqlite/research/thing-golf.md"
  - "@work/effect-native/effect-native/docs/style-guide.md"
tags:
  - frontend
  - auth
---
```

**Frontmatter fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier within package |
| `title` | yes | Human-readable name |
| `status` | no | Lifecycle stage (default: `spec`) |
| `owners` | no | Responsible parties |
| `created` | no | Creation date |
| `files` | no | Glob patterns for relevant impl files (default: `["src/**/*"]`) |
| `refs` | no | Repo-relative paths to reference docs AI should read |
| `tags` | no | Categorization labels |

**Path format:** Use path prefixes to avoid brittle `../../../../` paths:

| Prefix | Resolves to |
|--------|-------------|
| `@/` | Current repo root |
| `@wrapper/` | Parent wrapper repo root (for submodules) |
| `@wrapper/wrapper/` | Grandparent wrapper (nested submodules) |

**Wrapper repo support:** Submodules can reference files in their wrapper repo. This enables:
- Public submodule with specs that reference private wrapper docs
- Only leak is the path string itself (explicitly acceptable)
- Graceful degradation: if wrapper not found, ref is skipped with warning

```yaml
refs:
  - "@/docs/internal.md"                    # same repo
  - "@wrapper/research/thing-golf.md"       # parent wrapper repo
  - "@wrapper/private/scoring-weights.md"   # private doc in wrapper
```

Resolution algorithm:
1. `@/` → `git rev-parse --show-toplevel`
2. `@wrapper/` → walk up from repo root looking for parent `.git`
3. If wrapper not found, log warning and skip ref

**File targeting examples:**

```yaml
# TypeScript logic only
files: ["src/**/*.ts", "!src/**/*.test.ts"]

# Styles only  
files: ["src/**/*.css", "src/**/*.scss"]

# Specific module
files: ["src/auth/**/*"]

# Everything (default)
files: ["src/**/*"]
```

Observable:
- AI only analyzes files matching the spec's `files` patterns
- Gaps reference specific files within the spec's scope
- Different specs can cover different parts of the codebase
- Overlapping file patterns allowed (same file can be covered by multiple specs)

# Layout

## Package structure
```
package/
├── SPEC.md              # Optional: root-level spec (copied to .ok/rules/default/)
├── src/                 # Implementation files
└── .ok/
    ├── hooks/
    │   └── pre-push     # Executable hook script (blocks until done)
    ├── push.log         # Hook execution log
    └── rules/           # All specs, gaps, and QA live here
        ├── default/     # Single-spec mode (from root SPEC.md)
        │   ├── SPEC.md
        │   ├── SPEC.QA.md
        │   └── *.gap.md
        ├── auth/        # Multi-spec: auth feature
        │   ├── SPEC.md
        │   ├── SPEC.QA.md
        │   └── *.gap.md
        └── styling/     # Multi-spec: styling rules
            ├── SPEC.md
            ├── SPEC.QA.md
            └── *.gap.md
```

# Interfaces

## `bun update-gaps` command

Manually triggers AI gap analysis without requiring a git push.

```bash
bun update-gaps           # Update all specs in current package
bun update-gaps auth      # Update specific spec by name
bun update-gaps --all     # Update all specs in all packages
```

Observable:
- Reads specs, impl files, and refs
- Calls AI to generate/update gaps and SPEC.QA.md
- Writes `.ok/rules/*/*.gap.md` and `.ok/rules/*/SPEC.QA.md`
- Does NOT auto-commit (user decides when to commit)

Use cases:
- Manual analysis during development
- CI integration without push hooks
- Debugging/testing the analysis

## `bun ok` command

```typescript
// Reads all .gaps/*.md and .qa/*.md
// Parses YAML frontmatter from each
// Displays summary without any network calls

interface GapFrontmatter {
  id: string
  title: string
  status: "open" | "resolved"
  severity: "critical" | "high" | "medium" | "low"
  category: "security" | "correctness" | "ux" | "informational"
  spec_section: string
  impl_location: string
  created: string
  resolved_at: string | null
  resolved_in: string | null
  resolved_reason: string | null
}

interface QAFrontmatter {
  id: string
  title: string
  status: "open" | "resolved"
  category: "ambiguity" | "underspecified" | "edge-case" | "contradiction"
  spec_section: string
  created: string
  resolved_at: string | null
  resolved_reason: string | null
}
```

### Exit codes
- 0: All critical/high items resolved
- 1: Has open critical items
- 2: Has open high items (no critical)

## AI Prompt Contract

The AI receives:
- Full SPEC.md content
- Implementation file contents
- Existing gap files (full content)
- Existing QA files (full content)

The AI produces:
- JSON array of gap updates/creates
- JSON array of QA updates/creates

Each item includes full frontmatter + markdown body.

# Performance Invariants

- `bun ok` completes in <100ms
- Hook execution does not block git commit
- AI calls run in parallel (gaps + QA simultaneously)
- File I/O is the only bottleneck for `bun ok`

# Security Considerations

- API keys read from environment, not hardcoded
- No sensitive data in gap/QA files
- Auto-commits only touch `.gaps/` and `.qa/` directories

# Compatibility

- Requires: git, bun, bash
- Works with: pnpm workspaces, git submodules
- AI provider: OpenRouter (configurable model)
- Frontmatter parsing: Bun.YAML (built-in)
