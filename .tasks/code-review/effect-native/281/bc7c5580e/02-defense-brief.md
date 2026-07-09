# Defense Brief

## Issue: Unhex cause propagation remains a TODO

- **My Claim:** A changed error contract without a live test can regress silently.
- **Defense Hypothesis:** Removing a built-in SQLite function requires an impractical custom driver harness.
- **Evidence Search:** `.patterns/platform-integration.md` permits mocking a narrow service boundary. A proxy can delegate every operation to the real Bun client except the exact `SELECT hex(unhex('00'))` startup probe.
- **Verdict:** `survives`; replace the TODO with a focused Effect test that asserts both `UnhexUnavailable` and its underlying `SqlError` cause.
