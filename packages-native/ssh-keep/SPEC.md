---
id: work-order.ssh-keep
title: Server-resident SSH+tmux resilient entrypoint (bootstrap + session picker)
status: spec
owners:
  - dev-team
created: 2026-01-08
principles:
  - evergreen
  - regenerable-from-scratch
  - single-entrypoint
  - no-stale-state
  - idempotent
  - minimal-deps
---

# Intent

Provide a single, stable "entrypoint" a user can run from any thin client that:
1) SSHes into a server,
2) lands inside a persistent tmux session,
3) survives random disconnections without losing running processes,
4) supports reconnecting later from any device,
5) offers an interactive arrow-key picker to select an existing session,
6) can be regenerated if the implementation disappears.

This spec describes the *ideal end state* as observable behaviors + invariants.

# Glossary

- **Thin client**: any device initiating SSH (laptop, phone, kiosk).
- **Server**: remote host where tmux sessions live.
- **Entrypoint**: a single user-facing command invoked on the thin client (the "one-liner" experience).
- **Helper**: a server-resident executable installed into standard user directories (see Layout).
- **Bootstrap**: first-run behavior that ensures helper exists and is runnable.
- **Session**: tmux session. Sessions are the source of truth for "what exists".

# Scope

## In-scope
- SSH -> tmux attach/create workflow
- First-run bootstrap that installs helper in standard locations under the user's home directory
- Interactive session selection with arrow keys + Enter
- Named session attach-or-create
- Listing sessions
- A spec-first workflow: implementation can be deleted and recreated; the system converges back to this end state

## Explicit non-goals
- Remote privilege escalation / system-wide install
- Multiplexing across multiple servers in one invocation (host selection can be external)
- Comprehensive tmux configuration management (themes, keymaps, plugins)
- Guaranteeing continuation of processes that ignore SIGHUP outside tmux

# End-State Behaviors (User-visible)

## B1 — Single stable entrypoint
From a thin client, the user has a single command they can run that initiates the workflow and does not require remembering tmux commands.

Observable:
- Running the entrypoint with valid SSH access results in the user ending inside a tmux session on the server.

## B2 — Connection loss does not stop work
If the SSH connection drops unexpectedly while the user is inside the workflow, the server-side processes started within the session remain running.

Observable probe:
- Start a long-running command inside the tmux session.
- Force-disconnect SSH.
- Reconnect via the entrypoint.
- The command continues (or its output/log indicates continued progress) and the tmux session remains present.

## B3 — Attach-or-create by name
If the user provides a session name (via arg or env), the end state is:
- Attach to that session if it exists
- Otherwise create it
- In either case, the user lands inside it

Observable:
- With no existing session of that name: session appears.
- With existing session: does not create duplicates.

## B4 — Interactive picker when no name
If the user does not provide a session name, the end state is:
- The user is shown an interactive list of existing tmux sessions
- The UI supports arrow keys (up/down) and Enter to choose
- Choosing a session attaches the user to it
- There exists an affordance to create a new session from this UI flow

Observable:
- At least 2 existing sessions -> UI shows at least those 2, selectable by arrow keys.
- Enter attaches to the highlighted session.

## B5 — Source of truth is tmux, not app state
Session existence and metadata are derived from tmux, not from stored lists.

Invariant:
- If tmux lists a session, it can be selected/attached.
- If tmux does not list a session, it is not selectable (no phantom sessions).

## B6 — Idempotent and safe to rerun
Repeated invocations of the entrypoint are safe:
- They do not corrupt user shell startup files
- They do not duplicate installs noisily
- They converge to the same helper state

Observable:
- Running entrypoint N times yields same file layout and behavior.
- No growing junk files.

## B7 — Zero/low-friction bootstrap
On first run (helper absent), the workflow still succeeds:
- The entrypoint triggers bootstrap
- Helper becomes available in standard user paths
- The user ends in tmux session as if it had already been installed

Observable:
- Fresh account with no helper files: one run produces correct layout and functional behavior.

## B8 — Graceful degradation
If optional UI dependencies are missing, the workflow remains usable.

Observable:
- When "fancy picker" dependency is absent, there is still a way to:
  - list sessions
  - attach by name
  - create a new session
  - choose a session (even if via tmux-native UI or prompt)

# Layout (Standard locations)

The helper and its state/config live in conventional XDG-ish locations.

## Required
- `~/.local/bin/ssh-keep` — executable entrypoint used *on the server*
- `~/.config/ssh-keep/...` — config (human-editable)
- `~/.local/state/ssh-keep/...` — runtime state (MRU, host/session hints), optional

Invariants:
- No writes outside the user's home directory.
- No mandatory edits to `.bashrc`, `.zshrc`, etc.

# Interfaces

## Thin-client entrypoint contract
The thin-client command:
- Must allocate a TTY (interactive) so picker works
- Must run a single remote command that:
  - ensures helper exists (bootstrap if needed)
  - invokes helper to attach/create/pick session

Observable:
- The workflow functions identically from different clients (Mac, phone, etc.) as long as SSH works.

## Helper CLI contract (server side)
Helper supports:
- `--session <name>` or equivalent
- "no args" meaning "picker mode"
- "list mode" (explicit command or flag) that prints sessions in a machine-friendly format
- Exit codes that distinguish:
  - user cancel
  - tmux missing
  - ssh tty missing / non-interactive

# Security / Safety invariants

- Does not require elevated privileges.
- Does not weaken SSH security (no key copying, no credential capture).
- Does not log sensitive environment variables by default.
- Does not execute arbitrary remote code beyond what is necessary to meet behaviors.

# Performance invariants

- Cold start (bootstrap) is bounded and does not significantly delay login beyond what is necessary.
- Warm start (helper present) is near-immediate relative to normal SSH login.

# Compatibility assumptions (declare + test)

- Server has: SSH access, a POSIX shell, and tmux available (or a clear failure mode if tmux is absent).
- Shells: support for common shells (bash/zsh) is desirable; helper must not depend on a specific interactive shell startup side effect.

# Observability / Probes (Spec-driven checks)

Provide a small set of probes to compare implementation vs spec:

1. **Bootstrap probe**
   - Delete helper files (layout paths).
   - Run thin-client entrypoint.
   - Expect: helper recreated; lands inside tmux.

2. **Resilience probe**
   - In tmux: run a long command writing a timestamped line every second.
   - Disconnect SSH hard.
   - Reconnect and attach.
   - Expect: timestamps show continuity.

3. **Picker probe**
   - Ensure 2+ sessions exist.
   - Run entrypoint without name.
   - Expect: arrow-key selection UI; attaches correctly.

4. **Idempotence probe**
   - Run entrypoint repeatedly.
   - Expect: no duplicate helper installs; no growing junk.

5. **Truth probe**
   - Create/delete sessions directly via tmux.
   - Picker reflects current reality.

# Regenerability requirement

The system must be regenerable from zero:
- If the helper disappears (deleted, corrupted, reverted), invoking the thin-client entrypoint restores the working end state without manual reinstallation steps.
- The regeneration path is deterministic and does not depend on hidden mutable state.

Observable:
- "rm -rf ~/.local/bin/ssh-keep ~/.config/ssh-keep ~/.local/state/ssh-keep"
- Next run succeeds.

# Non-interference invariants

- Does not hijack normal SSH usage when the user does not invoke the entrypoint.
- Does not break existing tmux workflows; it coexists with manual tmux usage.
- Does not rename or destroy existing sessions without explicit user choice.

# Deliverables (end-state artifacts)

- A thin-client usage pattern (documented) that reliably enters the workflow.
- A server-side helper installed under standard directories.
- Minimal documentation: what the entrypoint does, how to pass a session name, how to recover if tmux is missing.
- A probe checklist that can be run periodically to expose gaps.

# Open design degrees of freedom (left to implementation)

- Picker UI choice (fzf vs tmux-native chooser vs prompt fallback).
- How MRU sorting is implemented (if any).
- Session naming conventions and defaults.
- How the bootstrap is transported (inline heredoc, remote fetch, embedded payload, etc.), as long as it satisfies the invariants above.
