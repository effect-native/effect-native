## Code Review Log - https://github.com/effect-native/effect-native/pull/281

### 1. Incentive (Hypothesis)

- Claim: Adding the missing capability test completes the review fixes.
- Evidence: CR-SQLite reports 43 passing tests and both changed error mappings preserve causes.

### 2. Adversarial Attack (Falsification)

- [blocker] `bun run ok` fails because `spawnTui > can resize terminal` times out under the full parallel test suite.
- Race Conditions: the test calls `resize`, immediately runs `tput cols`, and waits for a bare number while PTY input echo is enabled. There is no acknowledgement that the child has observed `SIGWINCH`.
- Reproduction: the same test timed out during the original refresh and again on `c5fd4dc88`; isolated reruns alone are insufficient evidence.

### 3. Simplicity (Stability)

- Claim: Synchronization belongs in the test command, not as a larger timeout.
- Evidence: an echo-free shell plus a bounded poll for `tput cols` produces an unambiguous `RESIZED:<width>` marker.

### 4. Reversibility (Safety)

- Claim: The fix changes only test synchronization.
- Evidence: no production PTY API or timeout defaults need to change.
