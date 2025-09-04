# Agent Contribution Rules

This repository enforces a fail-fast, evidence-first workflow. Agents and contributors must not hide defects behind optional guards or conditional logic in tests.

## Hard-Fail Policy (Never Hide Defects)

- NEVER add conditional wrappers (feature-detection, try/catch fallbacks, dynamic-import guards, environment sniffing, etc.) to silence or skip integration tests. If a dependency is missing or misconfigured (e.g., native modules like `better-sqlite3`), tests MUST FAIL LOUDLY.
- NEVER convert hard failures into no-ops (e.g., returning `Effect.void` or “skip” behavior) without an explicit repository decision recorded in a PR description and this file. The default is fail-fast.
- NEVER obfuscate errors or swallow exceptions in test setup. Prefer explicit, early failures that surface configuration issues.

## Rationale

Failing fast makes defects visible early, prevents silent regressions, and aligns local behavior with CI. Any environment constraints should be resolved by fixing the environment or adjusting the build matrix — not by weakening tests.

## Evidence-First Expectations

- When changing tests or infrastructure:
  - Provide concrete file paths and code references for the behavior being asserted.
  - If a failure requires an environment change, document the exact steps to reproduce and remediate (e.g., reinstall `better-sqlite3` for the current Node version).
- All changes must keep `pnpm ok` green unless a failing test is intentionally introduced as part of a RED phase in a TDD cycle (and is clearly marked as such in the PR).

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
