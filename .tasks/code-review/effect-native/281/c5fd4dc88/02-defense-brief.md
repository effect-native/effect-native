# Defense Brief

## Issue: PTY resize test flakes under the full suite

- **My Claim:** The repeated timeout invalidates the full quality gate.
- **Defense Hypothesis:** A one-off host scheduling delay can be handled by rerunning the test.
- **Evidence Search:** The same failure occurred twice across separate full-suite runs. The test has an actual race: `terminal.resize` has no child-side acknowledgement, and a bare numeric needle is ambiguous when terminal echo is active.
- **Verdict:** `survives`; synchronize on a bounded child-side width poll and a unique output marker without increasing or suppressing the test timeout.
