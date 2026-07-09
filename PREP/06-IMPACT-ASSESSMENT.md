# Impact Assessment

## Practical Impact

- Positive: the repo now tracks beta.94 and no longer depends on removed `ServiceMap` or `makeUnsafe` APIs.
- Positive: CR-SQLite metadata construction now validates through `.makeEffect` while preserving typed error translation.
- Risk: `bun.lock` lost native `better-sqlite3` transitive entries because `@effect/sql-sqlite-node@4.0.0-beta.94` no longer depends on it. This is expected upstream drift and is covered by package tests.

## Social / Maintenance Impact

- The `v4-refresh` branch and PR make the weekly update reviewable instead of silently merging churn.
- DotOK records make the recurring target state testable.
- The recurring automation should report exact versions, SHAs, gates, and any remaining gaps so weekly maintenance remains auditable.
