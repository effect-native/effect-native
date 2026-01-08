# GAPS.md — Gaps Between Spec and Implementation

## Resolved

No previously identified gaps have been resolved - the implementation remains unchanged from the previous analysis.

## Spec Requires, Impl Missing

### Security/Safety Gaps

**GAP-S1: No SSH access validation**
- **Spec**: Requires valid SSH access for workflow to function
- **Impl**: No validation of SSH connectivity before attempting connection
- **Location**: cli.ts - directly spawns SSH without checking if host is reachable
- **Severity**: Correctness

**GAP-S2: No environment variable logging protection**
- **Spec**: "Does not log sensitive environment variables by default"
- **Impl**: No explicit protection against environment variable exposure in error cases
- **Location**: No implementation of environment sanitization
- **Severity**: Security

### Behavioral Gaps

**GAP-B1: Missing session listing capability**
- **Spec**: B4 requires "interactive list of existing tmux sessions"
- **Impl**: Helper script only shows native tmux choose-tree, which may not meet "arrow keys + Enter" requirement for all tmux versions
- **Location**: HELPER_SCRIPT uses `tmux choose-tree -s` without ensuring arrow key navigation
- **Severity**: Correctness

**GAP-B2: No "create new session" affordance in picker**
- **Spec**: B4 requires "There exists an affordance to create a new session from this UI flow"
- **Impl**: tmux choose-tree doesn't provide a clear way to create new sessions from the picker UI
- **Location**: HELPER_SCRIPT picker mode
- **Severity**: Correctness

**GAP-B3: No graceful degradation for picker dependencies**
- **Spec**: B8 requires graceful degradation when "fancy picker dependency is absent"
- **Impl**: Only implements tmux choose-tree fallback, no further degradation path if choose-tree fails
- **Location**: HELPER_SCRIPT picker logic
- **Severity**: Correctness

**GAP-B4: Missing explicit list mode**
- **Spec**: Helper CLI contract requires "list mode (explicit command or flag) that prints sessions in a machine-friendly format"
- **Impl**: Has `--list` flag but it's not documented or tested in the thin-client interface
- **Location**: cli.ts doesn't expose --list functionality to end users
- **Severity**: Correctness

### Error Handling Gaps

**GAP-E1: Incomplete exit code handling**
- **Spec**: Helper should distinguish "user cancel", "tmux missing", "ssh tty missing"
- **Impl**: Helper exits with codes 2 (tmux missing) and 3 (no TTY) but no user cancel handling
- **Location**: HELPER_SCRIPT doesn't handle user cancellation in choose-tree
- **Severity**: Correctness

**GAP-E2: No clear tmux absence failure mode**
- **Spec**: "clear failure mode if tmux is absent"
- **Impl**: Helper exits with error code 2 but thin client doesn't interpret or explain this
- **Location**: cli.ts doesn't handle specific exit codes from helper
- **Severity**: UX

## Impl Does, Spec Doesn't Specify

### Implementation Choices (Informational)

**EXT-1: Bun runtime dependency**
- **Impl**: Uses Bun as the JavaScript runtime
- **Spec**: Doesn't specify runtime requirements beyond POSIX shell on server
- **Impact**: Adds client-side dependency not mentioned in spec

**EXT-2: Default session name "main"**
- **Impl**: Creates session named "main" when no sessions exist
- **Spec**: Leaves session naming conventions to implementation
- **Impact**: Reasonable default choice

**EXT-3: Embedded helper script**
- **Impl**: Uses heredoc embedding for bootstrap transport
- **Spec**: Leaves bootstrap transport method as "design degree of freedom"
- **Impact**: Valid implementation choice

**EXT-4: Specific directory creation**
- **Impl**: Creates all three directories (bin, config, state) even if not immediately needed
- **Spec**: Only requires the directories that are actually used
- **Impact**: Proactive but harmless

## Potential Issues

### Security Issues

**ISSUE-S1: Heredoc injection potential**
- **Description**: HELPER_SCRIPT embedded as string could be vulnerable to injection if any dynamic content were added
- **Location**: cli.ts line with HELPER_SCRIPT template
- **Severity**: Security (Low - currently no dynamic content)

### Correctness Issues

**ISSUE-C1: No session name validation**
- **Description**: Session names passed to tmux are not validated, could cause tmux errors
- **Location**: cli.ts sessionName handling and HELPER_SCRIPT
- **Severity**: Correctness

**ISSUE-C2: Race condition in bootstrap**
- **Description**: Multiple simultaneous connections could create competing helper installs
- **Location**: Remote command bootstrap logic lacks atomic operations
- **Severity**: Correctness

### UX Issues

**ISSUE-U1: Poor error messages**
- **Description**: SSH errors are passed through without interpretation or helpful guidance
- **Location**: cli.ts spawn handling
- **Severity**: UX

**ISSUE-U2: No session name auto-completion**
- **Description**: CLI doesn't provide hints about existing sessions when using -s flag
- **Location**: cli.ts argument parsing
- **Severity**: UX

## Summary Table

| ID | Description | Severity | Status | Impl Change Needed |
|----|-------------|----------|--------|-------------------|
| GAP-S2 | No environment variable logging protection | Security | Open | Yes |
| GAP-B1 | Missing guaranteed arrow key session picker | Correctness | Open | Yes |
| GAP-B2 | No "create new session" affordance in picker | Correctness | Open | Yes |
| GAP-B3 | No graceful degradation beyond choose-tree | Correctness | Open | Yes |
| GAP-B4 | Missing explicit list mode in thin client | Correctness | Open | Yes |
| GAP-S1 | No SSH access validation | Correctness | Open | Yes |
| GAP-E1 | Incomplete exit code handling | Correctness | Open | Yes |
| GAP-E2 | No clear tmux absence failure mode | UX | Open | Yes |
| ISSUE-S1 | Heredoc injection potential | Security (Low) | Open | No (monitor) |
| ISSUE-C1 | No session name validation | Correctness | Open | Yes |
| ISSUE-C2 | Bootstrap race condition | Correctness | Open | Yes |
| ISSUE-U1 | Poor error messages | UX | Open | No (enhancement) |
| ISSUE-U2 | No session name auto-completion | UX | Open | No (enhancement) |

## Recommended Priority List

1. **GAP-S2** - Implement environment variable sanitization
2. **GAP-B1** - Ensure reliable arrow key picker (test tmux version compatibility)
3. **GAP-B2** - Add "create new session" option to picker flow
4. **ISSUE-C2** - Fix bootstrap race condition with atomic operations
5. **GAP-B4** - Expose list functionality in thin client interface
6. **GAP-E1** - Handle user cancellation and improve exit codes
7. **GAP-B3** - Implement fallback picker when choose-tree unavailable
8. **ISSUE-C1** - Add session name validation
9. **GAP-S1** - Add SSH connectivity validation
10. **GAP-E2** - Improve error messaging for missing tmux

The implementation covers the core functionality but has several gaps in robustness, error handling, and user experience that should be addressed to fully meet the specification requirements.