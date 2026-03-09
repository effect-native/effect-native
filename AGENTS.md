# Agent Contribution Rules

We practice ultra extreme programming (uXP): tight feedback loops, evidence-first decision making, and collective ownership. Every change must be grounded in tests-first thinking and the scientific method, and nothing in our code is somebody else's problem.

## OK, Gaps, and Work Orders

We keep the evergreen definition of what "ok / done / healthy" means in `.ok/`.

We generate a point-in-time gaps snapshot in `.gaps/` by comparing `.ok/` to the
current repo reality (tests, scripts, workflows, versions, etc.).

We keep `.tasks/` as ephemeral work orders regenerated from the snapshot.
See `.tasks/AGENTS.md` for the exact workflow.

## Spec-Driven Features

Use `.specs/AGENTS.md` for formal feature development that requires the full
5-phase spec workflow and explicit approval gates.

## Pattern Library Contract

The documentation in `.patterns/*.md` is normative. Before writing or reviewing code, identify the relevant pattern files, follow them precisely, and cite them when presenting evidence. If a scenario is not covered, extend the patterns with a documented consensus—never improvise contradictory behavior.

### Effect Development (`.patterns/effect-library-development.md`)

- Never introduce `try`/`catch` inside `Effect.gen`; model control flow with Effect primitives.
- Always terminate failing or interrupting branches with `return yield* ...`.
- Resolve type problems instead of masking them with assertions; when TypeScript types disagree, fix the types.
- After editing TypeScript, run `bun run lint-fix` to enforce immediate linting.

### Error Handling (`.patterns/error-handling.md`)

- Model domain failures with `Data.TaggedError` hierarchies and rich error reasons.
- Convert external failures via `Effect.try`/`Effect.tryPromise`, returning structured errors instead of raw exceptions.
- Keep error pathways explicit; no swallowing, downgrading, or conditionalizing of failures.

### Module Organization (`.patterns/module-organization.md`)

- Follow the established directory and index export structure when adding modules.
- Keep public APIs in top-level modules and private details in corresponding `internal/` files.
- Use standard naming patterns for constructors, combinators, and predicates to maintain discoverability.

### Documentation (`.patterns/jsdoc-documentation.md`)

- Maintain complete, compilable JSDoc examples; run `bun run docgen` after documentation changes.
- Prefer multiple realistic examples over deleting content when fixing docgen failures.
- Use canonical Effect v4 import forms (`import { Schema } from "effect"`, `import { SqlClient } from "effect/unstable/sql"`, etc.) and forbid unsafe type assertions in docs.

### Testing (`.patterns/testing-patterns.md`)

- Use `@effect-native/bun-test` with `it.effect` and `expect(...)` for Effectful tests; use the same runner for pure-function tests.
- Replace wall-clock waits with `TestClock` for time-sensitive behavior.
- Never rely on `Effect.runSync` inside Effect-based tests.

### Platform Integration (`.patterns/platform-integration.md`)

- Express platform concerns through service abstractions and layers; provide platform-specific implementations separately.
- Translate platform errors into `PlatformError` variants with consistent reasons.
- Favor reusable, cross-platform-friendly integration points over ad-hoc conditionals.

## Hard-Fail Policy (Never Hide Defects)

- NEVER add conditional wrappers (feature-detection, try/catch fallbacks, dynamic-import guards, environment sniffing, etc.) to silence or skip integration tests. If a dependency is missing or misconfigured (e.g., native modules like `better-sqlite3`), tests MUST FAIL LOUDLY.
- NEVER convert hard failures into no-ops (e.g., returning `Effect.void` or “skip” behavior) without an explicit repository decision recorded in a PR description and this file. The default is fail-fast.
- NEVER obfuscate errors or swallow exceptions in test setup. Prefer explicit, early failures that surface configuration issues.

### Explicit Exception (Current)

- `packages/examples-tui-testing-library/test/lazygit.test.ts` is an example/stress suite that runs an external interactive TUI (`lazygit`) in a PTY + Ghostty harness.
- When lazygit itself cannot fully initialize in the ephemeral temp workspace, the suite may skip individual stress assertions and report diagnostics instead of failing the entire pipeline.
- This exception is intentionally narrow to the file above and does not apply to core package integration tests.

## Rationale

Failing fast makes defects visible early, prevents silent regressions, and aligns local behavior with CI. Any environment constraints should be resolved by fixing the environment or adjusting the build matrix — not by weakening tests.

## Evidence-First Expectations

- When changing tests or infrastructure:
  - Provide concrete file paths and code references for the behavior being asserted, referencing the relevant `.patterns/*.md` guidance.
  - If a failure requires an environment change, document the exact steps to reproduce and remediate (e.g., reinstall `better-sqlite3` for the current Node version).
- All changes must keep `bun run ok` green unless a failing test is intentionally introduced as part of a RED phase in a TDD cycle (and is clearly marked as such in the PR).

## Examples of Disallowed Patterns

- Dynamic import guards to skip tests when a module is missing:

  ```ts
  // ❌ Do not do this
  Effect.tryPromise(() => import("better-sqlite3")).pipe(
    Effect.flatMap((ok) => (ok ? test : Effect.void))
  )
  ```

- Swallowing initialization failures:
  ```ts
  // ❌ Do not do this
  client.loadExtension(ext).pipe(Effect.orDie) // hides misconfiguration
  ```

## Positive Patterns

- Ensure native dependencies match the current runtime. If installing is not possible in a given matrix, mark tests with a clear CI job exclusion rather than weakening test logic.
- Keep integration tests using the real drivers and environments; prefer realistic failure modes over mocks for critical paths.

## TypeScript Type Assertions (`as`) Policy

- Prefer type inference and precise types. Avoid assertions that "lie about reality" by widening or narrowing without proof.
- "as const" is explicitly allowed and encouraged: it narrows values (e.g., tuples and object literals) and increases strictness. This does not misrepresent runtime values.
- "as any" is explicitly banned. It disables type safety and is a foot cannon.
- Double assertions (e.g., `as unknown as T`) and other unsafe up/down casts are banned by default unless narrowly justified.
- Rare exceptions must be explicitly justified:
  - Place a one‑line comment immediately above the assertion with:
    - `Justification:` short, concrete rationale explaining why the assertion is safe and unavoidable.
    - `Approved‑by:` the handle of a specific engineer who reviewed the line (not an agent; do not impersonate anyone). Include a link to the PR or issue.
  - Example (allowed):
    ```ts
    // Justification: upstream API returns branded string at runtime; Approved-by: @eng-handle (PR #123)
    const id = value as Brand<Id>
    ```
  - Example (forbidden):
    ```ts
    // "works on my machine"
    const x = foo as any // ❌ banned
    ```
- Agents MUST NOT self‑approve or forge approvals. Do not use the repository owner's name or identity; never impersonate a human reviewer.

## Modern Effect Patterns (v4)

This repository targets the Effect v4 ecosystem. Code reviews and agents should expect and accept these patterns:

- **Package layout**: Prefer core imports from `effect`, keep platform-specific integrations in `@effect/platform-*`, and use unstable modules from `effect/unstable/*` when an API has not graduated yet.
- **Service definitions**: Prefer `ServiceMap.Service` over `Context.Tag` for new services and service-like references.
- **Function constructors**: Prefer `Effect.fn("name")` for reusable public effectful functions, `Effect.gen` for inline composition, and `Effect.fnUntraced` only for internal or hot-path helpers.
- **Error creation**: Effect v4 supports direct yielding of yieldable error constructors:

  ```ts
  // ✅ Modern Effect v4 (preferred)
  return yield * new SqliteClientError({ cause: "..." })

  // ✅ Legacy syntax (valid but unnecessarily verbose)
  return yield * Effect.fail(new SqliteClientError({ cause: "..." }))
  ```

- **Rationale**: Yieldable error classes keep generator code concise while preserving type safety and explicit failure channels.

- **Review Expectation**: Contributors and automated reviews should NOT flag the modern `yield* new Error()` syntax as incorrect. It is a normal Effect v4 pattern.

## Tooling & Nix Development Environment

`v4` is bun-first. Use host Bun by default, and use Nix as an optional convenience when you want a CI-like shell.

- **Default commands**:

  ```bash
  bun install --frozen-lockfile
  bun run lint-fix
  bun run docgen
  bun run ok
  bun run test
  ```

- **Optional Nix wrappers**:

  ```bash
  nix develop --command bun install --frozen-lockfile
  nix develop --command bun run ok
  ```

- **Rationale**: Bun keeps local development fast; Nix remains available for reproducibility and environment troubleshooting.

### Native Modules (better-sqlite3) ABI Mismatch

- Symptom: Errors like "was compiled against a different Node.js version" or mismatched `NODE_MODULE_VERSION` (e.g., 131 vs 137) when running tests that use `better-sqlite3`.
- Cause: Native addons were built against a different runtime ABI than the one executing tests.
- Resolution: Rebuild inside a consistent shell (Nix is the recommended fallback):
  - `nix develop --command bun install --frozen-lockfile`
  - `nix develop --command bun --filter '*' rebuild better-sqlite3`
  - Then re-run tests: `nix develop --command bun run test`

In practice: if host Bun and ABI versions stay aligned, local runs work; use Nix when you need reproducibility or ABI recovery.

## Reference Codebases

Use the shared reference checkout at `~/Work/refs`, with `effect-smol` as the default reference:

- **~/Work/refs/effect-smol/** - A streamlined Effect-TS variant (`Effect-TS/effect-smol`) with reduced scope and simplified patterns. Useful for seeing cleaner, more focused examples.

### Using References

When you need examples or patterns for how to use Effect:

1. **Search ~/Work/refs/effect-smol/** for simplified, clearer examples
2. Look at existing code in the reference projects to understand:
   - How to use specific Effect APIs correctly
   - Common patterns and best practices
   - Module structure and organization conventions
   - Testing approaches with `@effect-native/bun-test`

**Why these references exist:** Agents can search these codebases to find real-world examples of Effect patterns instead of guessing or relying on potentially outdated training data. When unsure how to implement something with Effect, search `~/Work/refs/effect-smol` first.

## Git and GitHub Workflow

### Repository Context

This is the `effect-native/effect-native` repository - a standalone Effect-based monorepo for native platform packages and tooling. Effect is used as a dependency, not as an upstream source.

- **origin**: `https://github.com/effect-native/effect-native.git`

### Pull Request Defaults

**Use standard `gh pr create` behavior - no special handling needed:**

```bash
# Standard PR creation
gh pr create --base v4

# Or with explicit repo (equivalent)
gh pr create --repo effect-native/effect-native --base v4
```

**Note:** Always use `v4` as the base branch for PRs in this repository.
