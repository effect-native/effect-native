## Code Review Log - https://github.com/effect-native/effect-native/pull/281

### 1. Incentive (Hypothesis)

- Claim: The refresh adopts Effect beta.94 without weakening public type coverage or error diagnostics.
- Evidence: Reviewer feedback identified one type assertion direction regression and two cause-dropping translations.

### 2. Adversarial Attack (Falsification)

- Type coverage: `packages/crsql/dtslint/CrSql.tst.ts` used `toBeAssignableTo`, which permits `never` and could miss a removed `SqlClient` requirement.
- Error diagnostics: `packages/crsql/src/CrSqliteExtension.ts` translated all extension lookup/load failures to `CrSqliteExtensionMissing` without preserving the original schema, SQL, or config error.
- Adjacent diagnostic gap: `packages/crsql/src/CrSql.ts` had the same cause-dropping shape in `finalize` and the `unhex()` capability probe.
- Null-only inference: `schemaFromChanges` skipped null observations, making the later null-only validation branch unreachable and silently omitting null-only columns.

### 3. Simplicity (Stability)

- The smallest stable fix is to correct the matcher direction, use `Effect.mapError` to preserve causes while keeping outward error types, and store `null` as an observed column state until a concrete type appears.

### 4. Reversibility (Safety)

- The patch is localized to CR-SQLite inference/error translation and one dtslint assertion. Reverting the follow-up commit returns to the prior refresh state without touching dependency versions.
