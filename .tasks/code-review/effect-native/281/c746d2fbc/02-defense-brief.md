# Defense Brief

## Issue: Type assertion direction

- **My Claim:** `toBeAssignableTo` can pass when `R` is `never`.
- **Defense Hypothesis:** Maybe TSTyche v7's matcher semantics differ from the name.
- **Evidence Search:** `node_modules/tstyche/dist/index.d.ts` documents `toBeAssignableFrom` and `toBeAssignableTo` as directional assignability checks.
- **Verdict:** `survives`.

## Issue: Dropped extension causes

- **My Claim:** The extension error wrappers discard useful causes.
- **Defense Hypothesis:** The outward error type might intentionally hide implementation details.
- **Evidence Search:** `.patterns/error-handling.md` requires structured causes, and existing CR-SQLite code at `CrSql.ts` already maps schema decode failures into `CrSqliteExtensionMissing({ cause })`.
- **Verdict:** `survives`.

## Issue: Null-only validation branch

- **My Claim:** The branch cannot trigger because null observations are never stored.
- **Defense Hypothesis:** CR-SQLite may emit another non-null row for every user column before null rows.
- **Evidence Search:** The code comments explicitly promise fail-fast behavior for null-only columns, and the aggregation code skipped those observations unconditionally.
- **Verdict:** `survives`.
