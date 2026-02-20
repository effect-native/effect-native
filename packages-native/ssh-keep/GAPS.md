# GAPS.md — Gaps Between Spec and Implementation

This document identifies concrete discrepancies between SPEC.md and the current implementation in `src/cli.ts`.

---

## Spec Requires, Impl Missing

### GAP-1: Environment Variable for Session Name

**Spec (B3)**:

> "If the user provides a session name (via arg or env)"

**Impl**: Only supports `-s`/`--session` argument. No environment variable check.

**Fix**: Add check for `process.env.SSH_KEEP_SESSION` (or whichever var spec clarifies).

---

### GAP-2: User Cancel Exit Code

**Spec (Helper CLI contract)**:

> "Exit codes that distinguish: user cancel"

**Impl**: No handling for user cancel. If user quits picker (`Ctrl-C`), tmux exits with its own code, not a distinct ssh-keep code.

**Fix**: Wrap tmux invocation to detect cancel and return specific exit code.

---

### GAP-3: Config Directory Unused

**Spec (Layout)**:

> `~/.config/ssh-keep/...` — config (human-editable)

**Impl**: Creates directory but never reads from it. No config file support.

**Status**: Acceptable for v0, but spec implies config should exist.

---

### GAP-4: State Directory Unused

**Spec (Layout)**:

> `~/.local/state/ssh-keep/...` — runtime state (MRU, host/session hints), optional

**Impl**: Creates directory but never writes to it. No MRU tracking.

**Status**: Acceptable (marked "optional" in spec).

---

### GAP-5: Create-New Affordance in Picker

**Spec (B4)**:

> "There exists an affordance to create a new session from this UI flow"

**Impl**: Uses `tmux choose-tree -s` which has no obvious "create new" action. User must cancel and re-run with `-s newname`.

**Fix options**:

1. Document the workaround
2. Use fzf with a "Create new..." option
3. Wrap tmux in a script that offers the option

---

### GAP-6: Thin Client Portability

**Spec (Intent)**:

> "from any thin client (laptop, phone, kiosk)"

**Impl**: Requires `bun` runtime on thin client.

**Fix**: Provide pure-shell one-liner alternative for environments without bun:

```sh
ssh -t host 'mkdir -p ~/.local/bin && ... && ~/.local/bin/ssh-keep'
```

---

### GAP-7: Helper Version/Update Check

**Spec (Regenerability)**:

> "If the helper disappears (deleted, corrupted, reverted), invoking the thin-client entrypoint restores the working end state"

**Impl**: Only checks if file is missing (`[ ! -x ~/.local/bin/ssh-keep ]`). Does not detect outdated/corrupted helper.

**Fix**: Add version stamp and compare:

```sh
CURRENT_VERSION="0.0.1"
if [ ! -x ~/.local/bin/ssh-keep ] || ! grep -q "VERSION=$CURRENT_VERSION" ~/.local/bin/ssh-keep; then
  # reinstall
fi
```

---

### GAP-8: Session Name Quoting/Validation

**Spec (B3)**:

> "If the user provides a session name (via arg or env)"

**Impl**: Session name is interpolated into shell command without quoting:

```ts
const sessionArg = sessionName ? `-s ${sessionName}` : ""
```

**Risk**: Session names with spaces or special characters will break or cause injection.

**Fix**: Proper escaping:

```ts
const sessionArg = sessionName ? `-s '${sessionName.replace(/'/g, "'\\''")}'` : ""
```

---

## Impl Does, Spec Doesn't Specify

### IMPL-1: Default Session Name 'main'

**Impl**: When no sessions exist, automatically creates session named `main`.

**Spec**: Doesn't specify default name. Lists "Session naming conventions and defaults" as open design freedom.

**Status**: Acceptable, but worth documenting.

---

### IMPL-2: Thin-Client CLI Flags

**Impl**: Supports `-s`, `--session`, `-h`, `--help`

**Spec**: Only mentions `--session <name>` for the server-side helper. Thin-client flags are unspecified.

**Status**: Acceptable enhancement.

---

### IMPL-3: `--list` Flag Not Exposed to Thin Client

**Impl**: Server-side helper has `--list` flag, but thin-client doesn't expose it.

**Spec**: Mentions list mode as part of helper contract.

**Fix**: Add `ssh-keep <host> --list` support:

```sh
ssh host '~/.local/bin/ssh-keep --list'
```

---

### IMPL-4: Helper Uses `/bin/sh` Specifically

**Impl**: `#!/bin/sh` shebang

**Spec**: Says "POSIX shell" which `/bin/sh` satisfies, but some systems have non-POSIX `/bin/sh` (rare).

**Status**: Acceptable. Could use `#!/usr/bin/env sh` for extra portability.

---

## Potential Issues

### ISSUE-1: Double Backslash in Heredoc

**Impl (line 91)**:

```ts
exec tmux attach-session \\; choose-tree -s
```

The `\\;` is to escape the semicolon for tmux command chaining. This is correct for the shell heredoc context.

**Status**: Working as intended, but fragile. Consider using tmux `run-shell` or separate commands.

---

### ISSUE-2: Bootstrap Creates Directories Server Never Uses

**Impl**:

```sh
mkdir -p ~/.local/bin ~/.config/ssh-keep ~/.local/state/ssh-keep
```

Creates config and state directories that the helper never uses.

**Status**: Harmless but noisy. Consider only creating them when needed.

---

## Gap Summary Table

| ID     | Description                 | Severity | Impl Change Needed  |
| ------ | --------------------------- | -------- | ------------------- |
| GAP-1  | No env var for session      | Medium   | Yes                 |
| GAP-2  | No user-cancel exit code    | Low      | Optional            |
| GAP-3  | Config dir unused           | Low      | Future              |
| GAP-4  | State dir unused            | Low      | Future (optional)   |
| GAP-5  | No create-new in picker     | Medium   | Yes                 |
| GAP-6  | Requires bun on thin client | High     | Provide alternative |
| GAP-7  | No version/update check     | Medium   | Yes                 |
| GAP-8  | Session name injection risk | High     | Yes                 |
| IMPL-1 | Default name 'main'         | Low      | Document only       |
| IMPL-2 | Extra thin-client flags     | Low      | Document only       |
| IMPL-3 | --list not exposed          | Low      | Optional            |
| IMPL-4 | /bin/sh shebang             | Low      | Acceptable          |

---

## Recommended Priority

1. **GAP-8** (security) - Fix session name quoting
2. **GAP-6** (compatibility) - Document or provide shell alternative
3. **GAP-7** (maintenance) - Add version check
4. **GAP-5** (UX) - Improve create-new affordance
5. **GAP-1** (feature) - Add env var support
