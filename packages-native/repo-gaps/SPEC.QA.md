# SPEC.QA.md

---
id: QA-1
title: How does git hook installation/management work?
status: open
category: underspecified
spec_section: B5
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The spec mentions a "pre-push hook" but doesn't explain how it gets installed or managed. Who creates `.ok/hooks/pre-push`? How does it get registered with git? What happens if a package doesn't have the hook set up?

## Context

Git hooks need to be executable files in `.git/hooks/` or configured via `core.hooksPath`. The spec shows hooks living in `.ok/hooks/` but doesn't explain the connection.

## Suggested Resolution

Add a section explaining hook installation, possibly via `bun init` command or automatic setup on first `bun update-gaps` run.

---

---
id: QA-2
title: What happens when multiple packages change in one push?
status: open
category: underspecified
spec_section: B5
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

If a push includes changes to files in multiple packages, does the hook run AI analysis for all affected packages? How are the auto-commits structured - one per package or one combined commit?

## Context

Large repos might have dozens of packages. Running AI analysis on all of them could be very slow and expensive.

## Suggested Resolution

Clarify the batching strategy and whether there are optimizations for multi-package changes.

---

---
id: QA-3
title: How are gap IDs generated and what ensures uniqueness?
status: open
category: underspecified
spec_section: B2
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The spec shows gap IDs like `missing-env-var` but doesn't explain the generation algorithm. What happens if two gaps would generate the same slug? How is uniqueness ensured within a spec?

## Context

Gap IDs are used for cross-references and must be stable. Filename collision would break the system.

## Suggested Resolution

Define the slugification algorithm and collision resolution strategy (e.g., append numbers: `missing-env-var-2`).

---

---
id: QA-4
title: What's the AI prompt structure and context limits?
status: open
category: underspecified
spec_section: B4
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

How much context can the AI handle when analyzing large specs against large codebases? What's the prompt structure? How are token limits managed?

## Context

Real packages might have hundreds of files and very long specs. AI models have context windows that could be exceeded.

## Suggested Resolution

Define chunking strategies, prompt templates, and fallback behavior for oversized inputs.

---

---
id: QA-5
title: How does wrapper repo detection work with nested submodules?
status: open
category: ambiguity
spec_section: B9
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The spec mentions `@wrapper/wrapper/` for "nested submodules" but doesn't explain the detection algorithm. How many levels deep can this go? What if there are multiple parent git repos?

## Context

Complex repo structures might have arbitrary nesting. The walk-up algorithm needs clear termination conditions.

## Suggested Resolution

Define the exact algorithm with examples and edge case handling.

---

---
id: QA-6
title: What happens to gaps when implementation files are deleted?
status: open
category: edge-case
spec_section: B2
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

If a gap references `src/cli.ts:34` in its `impl_location` field, but that file gets deleted, what happens to the gap? Does it auto-resolve or become stale?

## Context

Refactoring often involves deleting and moving files. Gap references could become dangling pointers.

## Suggested Resolution

Define staleness detection and cleanup strategies for orphaned gap references.

---

---
id: QA-7
title: How are ThingBadness weights determined and configured?
status: open
category: underspecified
spec_section: B2
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The spec mentions "weighted sum" for ThingBadness but doesn't specify the weights. Are they configurable per package? Who decides that `safety` is more important than `burden`?

## Context

Different teams might prioritize different aspects. A scoring system needs transparent, configurable weights.

## Suggested Resolution

Define default weights and configuration mechanism (possibly in .ok/config.yaml).

---

---
id: QA-8
title: What AI model(s) and APIs are used?
status: open
category: underspecified
spec_section: B4
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

The spec is entirely model-agnostic but doesn't specify what AI service is used, how API keys are configured, or whether it supports multiple providers.

## Context

Different organizations have different AI provider preferences and policies. Some might want local models for sensitive code.

## Suggested Resolution

Add configuration section covering provider selection, API key management, and fallback strategies.

---

---
id: QA-9
title: How does the system handle spec syntax errors or malformed YAML?
status: open
category: edge-case
spec_section: B9
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

What happens if a SPEC.md has invalid YAML frontmatter or `bun ok` encounters corrupted .gap.md files? Does the whole system fail or gracefully degrade?

## Context

Manual editing of files could introduce syntax errors. The system should be resilient.

## Suggested Resolution

Define error handling and recovery strategies, possibly with repair suggestions.

---

---
id: QA-10
title: Is there a size/complexity limit for packages?
status: open
category: ambiguity
spec_section: Scope
created: 2026-01-08
resolved_at: null
resolved_reason: null
---

## Question

Could this system work on a package with 10,000+ files and multiple large specs? Are there performance guarantees or recommended limits?

## Context

Large monorepos might stress the system beyond practical usability. Users need to know the boundaries.

## Suggested Resolution

Add performance characteristics and recommended usage limits to help users understand scaling boundaries.