## Code Review Log - https://github.com/effect-native/effect-native/pull/281

### 1. Incentive (Hypothesis)

- Claim: The prior review fixes make the Effect beta refresh safe to merge.
- Evidence: beta.94 remains current, all nine schema-inference tests are live, native binaries are absent from the final diff, and `bun run ok` passes.

### 2. Adversarial Attack (Falsification)

- Removed APIs: active guidance and code contain no `ServiceMap` or `.makeUnsafe` usage.
- Unsafe types: the diff adds no `as any`, `as unknown`, or `as never` assertions.
- Hidden failures: the schema-inference suite contains no skips.
- [risky] The PR changes the `unhex()` startup probe to preserve its SQL cause, but the matching capability test remains a TODO.

### 3. Simplicity (Stability)

- Claim: Cause preservation can be tested without creating a second SQLite implementation.
- Evidence: proxy the real `SqlClient` only for the exact startup probe while all extension loading and metadata queries continue through the real driver.

### 4. Reversibility (Safety)

- Claim: The missing test can be added without production changes.
- Evidence: the existing implementation already maps the failure correctly; only executable coverage is absent.
