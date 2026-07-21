## Code Review Log – evergreen v4-refresh

### 1. Incentive (Hypothesis)

- Claim: The change closes a measured dependency freshness gap.
- Evidence: npm beta tags are beta.97 while the base lockfile used beta.94.

### 2. Adversarial Attack (Falsification)

- Family skew: searched all four required lock entries; each is beta.97.
- Unrelated churn: inspected the complete lock diff; changes are limited to the
  selected family and its dependency metadata, including `multipasta`.
- API breakage: frozen install, typechecks, type tests, tests, builds, export
  verification, and docgen all passed through `bun run ok`.
- Hidden failure: no new source or test code exists in the diff; the forbidden
  ServiceMap search and `git diff --check` pass.

### 3. Simplicity (Stability)

- Claim: Lockfile-only runtime dependency movement is the smallest viable code delta.
- Evidence: beta ranges already exist in package manifests; no source edits were needed.

### 4. Reversibility (Safety)

- Claim: The refresh can be reverted without migration or persisted-state changes.
- Evidence: the runtime delta is dependency resolution only.
