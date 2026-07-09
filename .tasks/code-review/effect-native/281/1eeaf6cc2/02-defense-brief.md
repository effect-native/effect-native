# Defense Brief

## Issue: Latest beta may have moved during review

- **My Claim:** A stale beta would invalidate the refresh.
- **Defense Hypothesis:** The lockfile may still be current.
- **Evidence Search:** npm reports beta.94 for `effect`, `@effect/platform-node`, `@effect/sql-sqlite-bun`, and `@effect/sql-sqlite-node`; `bun.lock` resolves beta.94.
- **Verdict:** `withdrawn`.

## Issue: Compatibility fixes may preserve hidden regressions

- **My Claim:** Passing typechecks alone would not prove runtime error and schema behavior.
- **Defense Hypothesis:** Real integration tests may cover the changed contracts.
- **Evidence Search:** Both capability causes and all nine schema-inference paths run through the real Bun SQLite and CR-SQLite integration; 43 package tests pass with zero failures.
- **Verdict:** `withdrawn`.

## Issue: Native build workaround may broaden requirements

- **My Claim:** Darwin builds could require Nix unnecessarily or carry opaque artifacts.
- **Defense Hypothesis:** The wrapper and diff may already be constrained.
- **Evidence Search:** Re-entry requires an active Nix profile outside the dev shell, standalone Zig runs directly, the package build passes, and the final diff contains no binary files.
- **Verdict:** `withdrawn`.

## Issue: Full gate may remain flaky

- **My Claim:** The repeated PTY timeout could make `bun run ok` unreliable.
- **Defense Hypothesis:** Child-side synchronization may remove the race without weakening the assertion.
- **Evidence Search:** The test disables PTY echo, polls boundedly for child-observed width, uses a unique marker, passes 50 consecutive reruns, and passes under the full parallel gate.
- **Verdict:** `withdrawn`.

## Issue: Normative guidance may still teach removed APIs

- **My Claim:** Future changes could reintroduce `ServiceMap` from stale repository instructions.
- **Defense Hypothesis:** All active guidance may now use beta.94 patterns.
- **Evidence Search:** The DotOK removed-API gate passes; service examples use `Context.Service({ make })` with explicit layers.
- **Verdict:** `withdrawn`.
