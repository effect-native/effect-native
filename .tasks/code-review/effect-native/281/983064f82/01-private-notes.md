## Code Review Log - https://github.com/effect-native/effect-native/pull/281

### 1. Incentive (Hypothesis)

- Claim: The PR moves every package to the latest Effect beta and leaves a repeatable weekly refresh process.
- Evidence: npm reports beta.94 for the four Effect packages; `bun.lock` resolves beta.94; `.ok/effect-refresh.ok.md` defines the recurring gates.

### 2. Adversarial Attack (Falsification)

- [blocker] Normative guidance still imports removed `effect/ServiceMap` in `AGENTS.md`, `.patterns/effect-library-development.md`, `.patterns/module-organization.md`, and `.patterns/platform-integration.md`.
- [blocker] The null-only inference fix has no live regression coverage. Six focused tests and one end-to-end test are skipped under stale v0.0.0 comments.
- [blocker] Enabling those tests shows generated `id BLOB PRIMARY KEY` schemas cannot become CRRs because CR-SQLite requires a non-null primary key.
- [risky] Missing-extension error translation preserves a cause in code but has no test proving the cause survives.
- [risky] Darwin rebuilds unconditionally require `nix` outside a dev shell, including machines with a standalone Zig installation.
- [risky] Six opaque native binaries changed without a corresponding Zig source change and grew or shrank by up to an order of magnitude depending on target.
- [risky] CI overrides TSTyche's configured compiler matrix with a second inline `--target`, allowing local and CI coverage to drift later.
- Nulls/Edge Cases: null-only and null-then-concrete change streams were exercised directly.
- Race Conditions: no new concurrent state or asynchronous ownership was introduced by the PR.

### 3. Simplicity (Stability)

- Claim: Compatibility changes should remain package-local and generated artifacts should change only when their source changes.
- Evidence: service migrations are mechanical; removing unrelated native binary churn reduces the review surface; one TSTyche config can own the matrix.

### 4. Reversibility (Safety)

- Claim: The fixes are independently reversible.
- Evidence: guidance, tests, workflow, native wrapper condition, and generated DDL are isolated changes; the Effect lockfile update remains separate from native artifacts.
