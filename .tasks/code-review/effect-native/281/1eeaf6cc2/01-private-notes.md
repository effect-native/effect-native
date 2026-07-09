## Code Review Log - https://github.com/effect-native/effect-native/pull/281

### 1. Incentive (Hypothesis)

- Claim: The PR leaves `v4-refresh` current, reviewable, and safe to merge into `v4`.
- Evidence: npm beta tags and `bun.lock` agree on beta.94; `effect-smol` matches upstream at `3f0ccc04711b0a187b973e20fc9c3010c2560da2`; `origin/v4` is an ancestor of the reviewed head.

### 2. Adversarial Attack (Falsification)

- Dependency drift: re-queried all four npm beta tags immediately before verdict.
- Removed APIs: scanned active code, patterns, AGENTS, and DotOK state for `ServiceMap` and `.makeUnsafe`.
- Type safety: scanned added TypeScript for `as any`, `as unknown`, and `as never`.
- Error semantics: real-driver tests cover preserved causes for missing CR-SQLite and missing `unhex()`.
- Schema edge cases: nine active tests cover null-only, null-then-concrete, conflicting types, deterministic order, idempotence, and end-to-end recreation/application.
- Native portability: Darwin Nix re-entry is limited to active Nix profiles; standalone Zig remains direct.
- Opaque artifacts: final PR diff contains no binary changes.
- Race conditions: PTY resize now waits for child-observed width; 50 consecutive reruns and the full parallel suite pass.
- Quality gate: `bun run ok` passes end to end on the reviewed code.

### 3. Simplicity (Stability)

- Claim: The migration uses the smallest current upstream APIs and avoids duplicate configuration.
- Evidence: `Context.Service`, `Schema.makeEffect`, structured `SqlError` reasons, one TSTyche matrix, narrow tests, and no unrelated binary refresh.

### 4. Reversibility (Safety)

- Claim: Changes remain separable by concern.
- Evidence: dependency/tooling migration, CR-SQLite behavior fixes, PTY synchronization, evergreen contracts, and review records are isolated in the diff and commit history.
