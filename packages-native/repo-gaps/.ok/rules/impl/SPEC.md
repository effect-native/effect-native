---
id: impl
title: repo-gaps implementation specification
status: spec
owners:
  - dev-team
created: 2026-01-08
files:
  - "src/**/*.ts"
refs:
  - "@wrapper/research/thing-golf.md"
tags:
  - implementation
  - technical
---

# Directory Structure

All specs, gaps, and QA items live under `.ok/rules/` for tight locality:

```
package/
├── src/                     # Implementation
└── .ok/
    ├── hooks/
    │   └── pre-push         # Blocks until analysis done
    ├── push.log             # Hook execution log
    └── rules/
        ├── product/
        │   ├── SPEC.md      # Product spec
        │   ├── SPEC.QA.md   # QA for product spec
        │   └── *.gap.md     # Product gaps
        └── impl/
            ├── SPEC.md      # Impl spec
            ├── SPEC.QA.md   # QA for impl spec
            └── *.gap.md     # Impl gaps
```

# File Formats

## SPEC.md frontmatter

```yaml
---
id: feature-name           # Required: unique identifier
title: Human readable title # Required: display name
status: draft | spec | stable | deprecated
owners:
  - team-or-person
created: 2026-01-08
files:                      # Glob patterns for relevant impl files
  - "src/**/*.ts"
  - "!src/**/*.test.ts"
refs:                       # External docs AI should read
  - "@/docs/internal.md"
  - "@wrapper/research/thing-golf.md"
tags:
  - frontend
---
```

## Gap file format (*.gap.md)

```yaml
---
id: missing-env-var         # Slugified from title
title: Short description
status: open | resolved
severity: critical | high | medium | low
category: security | correctness | ux | informational
spec_section: B3
impl_location: src/cli.ts:34
created: 2026-01-08
resolved_at: null
resolved_in: null           # Commit SHA
resolved_reason: null
related:                    # Cross-references
  - other-spec/gap-id
blocks:                     # Gaps this blocks (blocked_by is derived)
  - other-spec/gap-id
badness:                    # ThingBadness scoring
  safety: 0                 # 0=safe, +N=explosive
  burden: 0                 # -N=lighter, +N=heavier
  chaos: 0                  # -N=clearer, +N=chaotic
  betrayal: 0               # 0=trustworthy, +N=betraying
  control: 0                # -N=freer, +N=control-freak
---

## Description
...

## Spec Says
...

## Implementation Does
...
```

## SPEC.QA.md format

Single file per spec containing all QA items with YAML frontmatter per item.

# Path Resolution

| Prefix | Resolves to |
|--------|-------------|
| `@/` | Current repo root (`git rev-parse --show-toplevel`) |
| `@wrapper/` | Parent wrapper repo (for submodules) |
| `@wrapper/wrapper/` | Grandparent wrapper |

Resolution algorithm:
1. `@/` → `git rev-parse --show-toplevel`
2. `@wrapper/` → walk up from repo root looking for parent `.git`
3. If not found → log warning, skip ref

# CLI Commands

## `bun ok`

Instant status display (no AI, no network).

```bash
bun ok              # Status for current package
bun ok --json       # Machine-readable output
```

Reads `.ok/rules/*/SPEC.md`, `*.gap.md`, `SPEC.QA.md` frontmatter only.
Derives `blocked_by` by inverting `blocks` graph.
Computes total badness and sorts by it.

Exit codes:
- 0: All critical/high resolved
- 1: Has open critical items
- 2: Has open high items (no critical)

## `bun update-gaps`

Manual AI analysis trigger.

```bash
bun update-gaps           # All specs in package
bun update-gaps impl      # Specific spec
bun update-gaps --all     # All packages
```

Does NOT auto-commit. User decides when to commit.

# Git Hooks

## Pre-push hook

Location: `.ok/hooks/pre-push` (symlinked from `.git/hooks/`)

Behavior:
1. Get changed files since last push
2. Find affected `.ok/` directories by walking up
3. Run AI analysis for each affected spec
4. Auto-commit with `[auto]` prefix
5. Allow push to proceed

Auto-commits marked `[auto]` are skipped on subsequent analysis.

# AI Integration

## Prompt inputs
- SPEC.md content
- Implementation files matching `files` patterns
- Referenced docs from `refs`
- Existing gap files
- Existing SPEC.QA.md

## Prompt outputs
- Updated/new gap files
- Updated SPEC.QA.md

Model: OpenRouter (configurable, default: claude-sonnet-4)

# Performance Requirements

- `bun ok`: <100ms, no network
- Pre-push hook: bounded by AI response time (~60s)
- Parallel AI calls for gaps + QA

# Dependencies

- Runtime: bun
- VCS: git
- AI: OpenRouter API (OPENROUTER_API_KEY env var)
- YAML: Bun.YAML (built-in)
