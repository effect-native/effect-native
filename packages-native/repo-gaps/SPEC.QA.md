# SPEC.QA.md — Open Questions and Concerns

## Ambiguities

**QA-1** (open): Directory structure inconsistency
- The overview shows `.ok/rules/product/` and `.ok/rules/impl/` structure, but the current implementation uses `.gaps/` and `.qa/` directly in package root
- Which structure is actually implemented? The spec should clarify the canonical directory layout

**QA-2** (open): Git hook installation process
- How is the pre-push hook initially installed/symlinked?
- What happens if the hook already exists?
- Is this done automatically or requires manual setup?

**QA-3** (open): OpenRouter model configuration
- Spec mentions "configurable, default: claude-sonnet-4" but doesn't specify how to configure
- Is this via environment variable, config file, or CLI flag?

**QA-4** (open): Auto-commit behavior boundaries
- When exactly does auto-commit happen vs. when should user manually commit?
- What if there are existing uncommitted changes in the working directory?

## Underspecified Behaviors

**QA-5** (open): Gap file ID generation
- Frontmatter says "Slugified from title" but doesn't specify the slugification algorithm
- What happens with duplicate IDs across different specs?

**QA-6** (open): Path resolution failure handling
- When `@wrapper/` resolution fails and logs warning, does processing continue or abort?
- Are there fallback behaviors for missing referenced files?

**QA-7** (open): File pattern matching semantics
- Are the `files` patterns in SPEC.md frontmatter gitignore-style or glob-style?
- How are exclusion patterns (starting with `!`) processed?

**QA-8** (open): "Changed files since last push" detection
- How is "last push" determined? Last push to current branch, any branch, or remote tracking branch?
- What happens in repos with no previous pushes?

**QA-9** (open): Parallel AI call error handling
- If one of the parallel AI calls (gaps vs QA) fails, does the other still complete?
- Are partial results committed or is it all-or-nothing?

## Edge Cases

**QA-10** (open): Empty or minimal responses
- Current implementation has 100-character minimum for AI responses - is this sufficient?
- What constitutes a "valid" response vs. hallucinated/nonsensical output?

**QA-11** (open): Submodule boundary conditions
- What happens when analyzing a submodule that references files in the parent via `@wrapper/`?
- How does the pre-push hook behave in nested git repositories?

**QA-12** (open): Concurrent executions
- What if `bun update-gaps` is running while the pre-push hook triggers?
- Are there file locking or race condition considerations?

**QA-13** (open): Large repository performance
- Performance requirements specify <100ms for `bun ok` but don't address repos with thousands of gap/QA files
- How does the system scale with repository size?

## Suggested Clarifications

**QA-14** (open): CLI interface completeness
- Spec shows `bun ok` and `bun update-gaps` but implementation also has `src/ok.ts` - should this be documented?
- Are there other CLI commands or flags not covered in the spec?

**QA-15** (open): Error recovery procedures
- When AI analysis fails (network, API limits, malformed responses), what's the user experience?
- Should there be retry logic or graceful degradation?

**QA-16** (open): Cross-spec dependency resolution
- The `related` and `blocks` fields suggest dependencies between specs, but resolution algorithm isn't specified
- How are circular dependencies handled?

**QA-17** (open): YAML parsing error handling
- What happens when gap files have malformed YAML frontmatter?
- Should the system fail fast or skip problematic files with warnings?