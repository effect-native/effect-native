## Code Review Log – https://github.com/effect-native/effect-native/pull/282

### 1. Incentive (Hypothesis)

- Claim: The refresh closes real dependency drift without broadening the API.
- Evidence: `.ok/effect-refresh.ok.md` requires the four registry beta tags to
  match `bun.lock`; npm reports beta.99 while the prior lock held beta.97.

### 2. Adversarial Attack (Falsification)

- Claim: I tried to break this refresh.
- Attack scenarios:
  - Family split: verified all four required lock entries and the transitive
    platform-node-shared peer family resolve to beta.99.
  - Resolver pollution: an initial root update added root dependencies and
    selected stable platform packages; those edits were removed and the frozen
    install verifies the corrected lock.
  - API drift: `bun run ok` exercised classic and native typecheckers, type
    tests, package tests, builds, export verification, and docgen.
  - Hidden failure behavior: the target commit adds no source, test skip,
    fallback, assertion, or native binary change.

### 3. Simplicity (Stability)

- Claim: This is the simplest design possible.
- Evidence: the runtime delta is five existing lock resolutions: the four
  requested packages plus their platform-node-shared dependency.

### 4. Reversibility (Safety)

- Claim: We can undo this without fire.
- Evidence: the beta.99 lock commit is isolated as
  `5b265b6be9adf6d4dd5ef05bdbf10f6d8699c035`; reverting it restores beta.97.

No blocker or risky finding survived prosecution.
