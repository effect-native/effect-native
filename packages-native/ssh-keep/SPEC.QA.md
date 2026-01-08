# SPEC.QA.md — Questions and Issues with the Specification

This document captures ambiguities, contradictions, and underspecified areas in SPEC.md that need clarification before the spec can be considered complete.

---

## 1. Session Name via Environment Variable

**Location**: B3 — Attach-or-create by name

> "If the user provides a session name (via arg or env)"

**Question**: Which environment variable? The spec mentions env support but doesn't name it.

- `SSH_KEEP_SESSION`?
- `TMUX_SESSION`?
- Something else?

**Impact**: Cannot implement env-based session selection without this.

---

## 2. "Create New Session" Affordance in Picker

**Location**: B4 — Interactive picker when no name

> "There exists an affordance to create a new session from this UI flow"

**Question**: What does this affordance look like?

- A menu item in the picker?
- A keybind (e.g., `n` for new)?
- A prompt after picker is dismissed?
- Automatic when zero sessions exist?

**Impact**: The current impl uses `tmux choose-tree` which doesn't have an obvious "create new" option. User must know to press `Ctrl-C` and re-run with `-s newname`.

---

## 3. Config Directory Contents

**Location**: Layout

> `~/.config/ssh-keep/...` — config (human-editable)

**Question**: What is configurable? The spec mentions this directory but never lists config options.

Candidates:
- Default session name?
- Picker UI preference (fzf vs native)?
- MRU behavior toggle?
- Custom tmux options passed on session create?

**Impact**: Impl creates the directory but it's currently dead space.

---

## 4. State Directory and MRU

**Location**: Layout

> `~/.local/state/ssh-keep/...` — runtime state (MRU, host/session hints), optional

**Question**: Is MRU a SHOULD or a MAY? If optional, should the directory still be created?

**Impact**: Impl creates the directory preemptively but never writes to it.

---

## 5. Machine-Friendly List Format

**Location**: Helper CLI contract

> "list mode" (explicit command or flag) that prints sessions in a machine-friendly format

**Question**: What format?

- Newline-separated session names?
- JSON array?
- Tab-separated with metadata (attached clients, creation time)?

**Impact**: Impl uses `tmux list-sessions -F '#{session_name}'` (newline-separated names only). Is that sufficient?

---

## 6. Exit Code Values

**Location**: Helper CLI contract

> Exit codes that distinguish: user cancel, tmux missing, ssh tty missing / non-interactive

**Question**: What are the actual numeric codes?

Current impl:
- `2` = tmux missing
- `3` = no TTY
- (user cancel not handled)

**Suggestion**: Spec should define:
- `0` = success (attached/created)
- `1` = general error
- `2` = tmux not found
- `3` = no TTY
- `4` = user cancelled (if distinguishable)

---

## 7. Zero Sessions vs Picker Behavior

**Location**: B4 vs B7

**B4** says:
> "The user is shown an interactive list of existing tmux sessions"

**B7** says:
> "Fresh account... the user ends in tmux session as if it had already been installed"

**Question**: When zero sessions exist, should the user:
- See an empty picker with "create new" affordance (B4 interpretation)?
- Automatically land in a new session (B7 interpretation)?

**Impact**: Impl auto-creates `main` session. This satisfies B7 but bypasses the picker entirely when no sessions exist.

---

## 8. Thin Client Runtime Requirements

**Location**: Intent, Thin-client entrypoint contract

> "from any thin client (laptop, phone, kiosk)"

**Question**: Does "any thin client" mean the entrypoint must work without installing anything? The current impl requires `bun` on the thin client.

Options:
1. Accept that thin client needs bun/node
2. Provide a pure-shell one-liner alternative
3. Provide a static binary

**Impact**: Phone/kiosk may not have bun. A pure-shell alternative would increase compatibility.

---

## 9. Session Name Character Restrictions

**Location**: B3

**Question**: What characters are valid in session names?

- Spaces?
- Slashes?
- Colons (tmux uses these in target syntax)?
- Unicode?

**Impact**: Current impl passes session name unquoted to shell, risking injection or breakage with special characters.

---

## 10. Multiple Attached Clients

**Location**: Not mentioned

**Question**: What happens when multiple thin clients attach to the same session?

tmux supports this natively, but:
- Should picker show "2 clients attached" metadata?
- Should there be a warning?
- Is this a non-goal?

---

## 11. Detach Behavior

**Location**: Not mentioned

**Question**: When user detaches from tmux (`Ctrl-b d`), what happens?

- SSH session ends, user returns to local shell?
- Return to picker to choose another session?
- Prompt asking what to do next?

**Impact**: Current impl exits on detach (SSH returns). Spec should state whether this is desired.

---

## 12. Helper Update Mechanism

**Location**: Regenerability requirement

> "If the helper disappears (deleted, corrupted, reverted)"

**Question**: What about an *outdated* helper? Current bootstrap only installs if file is missing (`[ ! -x ... ]`).

Options:
1. Version check and update if stale
2. Always overwrite (idempotent by definition)
3. Leave updates manual

**Impact**: If impl improves, users with old helpers won't get updates.

---

## 13. Probe Automation

**Location**: Observability / Probes

> "A probe checklist that can be run periodically to expose gaps"

**Question**: Should probes be runnable scripts, or manual procedures?

The current probes are described in English. Automated probes would require:
- A test server
- Ability to kill/reconnect SSH programmatically
- Session state assertions

**Suggestion**: Clarify if probes are acceptance criteria (manual QA) or automated tests.

---

## 14. Picker Behavior with Exactly One Session

**Location**: B4

> "At least 2 existing sessions -> UI shows at least those 2"

**Question**: What about exactly 1 session?

- Show picker with 1 item (allowing user to see it exists)?
- Auto-attach since there's no choice to make?

**Impact**: Impl shows picker even with 1 session. Is that correct?

---

## Summary

| Issue | Severity | Blocks Impl? |
|-------|----------|--------------|
| Env var name | Medium | Yes (if env support required) |
| Create-new affordance | Medium | Partially |
| Config contents | Low | No (empty is valid for now) |
| MRU spec | Low | No (optional) |
| List format | Low | No (current format works) |
| Exit codes | Medium | Partially |
| Zero-sessions behavior | Medium | No (impl chose one interpretation) |
| Thin client runtime | High | Limits portability |
| Session name chars | Medium | Security concern |
| Multi-client attach | Low | No (tmux handles it) |
| Detach behavior | Low | No (current behavior is fine) |
| Helper updates | Medium | Maintenance concern |
| Probe automation | Low | No (manual is fine for now) |
| Single-session picker | Low | No |
