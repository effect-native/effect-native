# SPEC.QA.md — Open Questions and Concerns

## Resolved

**QA-2: "Create New Session" Affordance in Picker** - RESOLVED  
The implementation shows this is handled by tmux's native behavior: when no sessions exist, it auto-creates 'main'. When sessions exist, `choose-tree` allows creating new sessions via tmux's built-in commands.

**QA-5: Machine-Friendly List Format** - RESOLVED  
The spec now shows `--list` flag outputting newline-separated session names via `tmux list-sessions -F '#{session_name}'`, which is sufficient for machine parsing.

**QA-7: Zero Sessions vs Picker Behavior** - RESOLVED  
Implementation clarifies the behavior: zero sessions auto-creates 'main' session (satisfying B7), while existing sessions show picker (satisfying B4).

**QA-14: Picker Behavior with Exactly One Session** - RESOLVED  
Implementation shows picker is displayed even with one session, allowing user visibility of what exists.

**QA-25: Entrypoint Definition Ambiguity** - RESOLVED  
Updated analysis shows there are two distinct entrypoints: thin-client command (`ssh-keep`) and server-side helper (`~/.local/bin/ssh-keep`). The spec correctly differentiates these in the "Interfaces" section.

---

## Ambiguities

**QA-1: Session Name Environment Variable** - OPEN  
Status: Unresolved  
The spec mentions "via arg or env" in B3 but doesn't specify which environment variable. Implementation only supports CLI args.

**QA-6: Exit Code Values** - OPEN  
Status: Unresolved  
Spec lists exit code categories but not numeric values. Implementation uses 2=tmux missing, 3=no TTY, but spec should standardize these.

**QA-9: Session Name Character Restrictions** - OPEN  
Status: Critical security issue  
Implementation passes `$SESSION_NAME` unquoted to shell in `tmux has-session -t "$SESSION_NAME"` and `tmux attach-session -t "$SESSION_NAME"`. While quoted in the tmux commands, the session name itself isn't validated, potentially allowing injection.

**QA-15: Helper Script Transport Method** - OPEN  
Status: Open  
The spec mentions bootstrap can be "inline heredoc, remote fetch, embedded payload, etc." but doesn't specify requirements. Current implementation uses heredoc with single quotes, but:
- Should the helper script be signed/checksummed for integrity?
- What happens if the heredoc contains the delimiter string `HELPER_EOF`?
- Is embedding the entire script in the thin client the intended approach?

**QA-33: Thin Client vs Server Helper Responsibility** - NEW  
Status: Critical ambiguity  
The spec doesn't clearly delineate which behaviors are implemented by the thin client vs server helper. For example:
- Who handles session name validation?
- Who determines fallback behavior when picker UI fails?
- Which side should implement the exit code contract?

---

## Underspecified Behaviors

**QA-3: Config Directory Contents** - OPEN  
Status: Unresolved  
Spec creates `~/.config/ssh-keep/` but never defines what's configurable. Implementation creates empty directory.

**QA-8: Thin Client Runtime Requirements** - OPEN  
Status: Blocks portability goal  
Spec claims support for "any thin client (laptop, phone, kiosk)" but implementation requires Bun runtime. This contradicts the portability intent.

**QA-11: Detach Behavior** - OPEN  
Status: Unresolved  
When user detaches from tmux (Ctrl-b d), implementation exits SSH session. Spec doesn't specify if this is intended behavior or if user should return to picker.

**QA-12: Helper Update Mechanism** - OPEN  
Status: Maintenance gap  
Bootstrap only installs if helper is missing (`[ ! -x ~/.local/bin/ssh-keep ]`). No mechanism for updating outdated helpers, conflicting with "regenerable" principle.

**QA-16: Graceful Degradation Details** - OPEN  
Status: Underspecified  
B8 requires graceful degradation when "fancy picker" dependencies are missing, but:
- Current implementation uses `tmux choose-tree` which is always available with tmux
- What constitutes a "fancy picker" vs basic picker?
- The fallback path isn't clearly defined in the spec

**QA-17: Session Creation Default Behavior** - OPEN  
Status: Underspecified  
When auto-creating sessions (named or default 'main'), the spec doesn't specify:
- Working directory for new sessions
- Initial shell/command 
- Window naming conventions
- Whether session should start with specific tmux configuration

**QA-27: Thin Client Command Distribution** - OPEN  
Status: Critical gap  
The spec describes behaviors but not how users obtain the thin client entrypoint:
- Is it a system package?
- User-compiled from source?
- Downloaded script?
- Shell function to be added to profiles?
This is essential for the "single stable entrypoint" promise.

**QA-28: Host Selection Scope Boundary** - OPEN  
Status: Underspecified  
Spec states "host selection can be external" but all behaviors assume a single target host. Unclear:
- Can the same helper work across multiple servers?
- Should session names be namespaced by host?
- How does MRU state work across hosts?

**QA-34: SSH Configuration Inheritance** - NEW  
Status: Underspecified  
The spec assumes SSH connectivity but doesn't specify how SSH configuration should be handled:
- Should the entrypoint respect SSH config files (~/.ssh/config)?
- How should SSH agent forwarding, port forwarding, or proxy jumps work?
- Are there SSH options that should be enforced or prohibited?

**QA-35: Tmux Configuration Interaction** - NEW  
Status: Underspecified  
The spec states it doesn't manage comprehensive tmux configuration but doesn't clarify interaction with existing tmux configs:
- Should it respect user's ~/.tmux.conf?
- What if user's config conflicts with required functionality (like session naming)?
- How does it interact with tmux plugins or custom key bindings?

---

## Edge Cases

**QA-10: Multiple Attached Clients** - OPEN  
Status: Unaddressed by spec  
Tmux supports multiple clients on same session. Spec doesn't address whether this should be indicated in picker or warned about.

**QA-18: Network Interruption During Bootstrap** - OPEN  
Status: Critical edge case  
If SSH connection drops while writing the helper script via heredoc:
- Helper file may be incomplete/corrupted
- Next bootstrap attempt may fail if partial file exists but isn't executable
- No verification that bootstrap completed successfully

**QA-19: Concurrent Bootstrap Attempts** - OPEN  
Status: Race condition  
Multiple simultaneous SSH connections during first-run could race:
- Both try to write `~/.local/bin/ssh-keep` simultaneously  
- File corruption or partial writes possible
- No atomic installation mechanism specified

**QA-20: TTY Size Changes** - OPEN  
Status: Edge case  
When client terminal resizes during picker interaction:
- Should picker adapt to new size?
- Current implementation may not handle dynamic resize gracefully
- Spec doesn't address terminal size requirements

**QA-29: SSH Key/Auth Failure Handling** - OPEN  
Status: Unaddressed  
Spec assumes "valid SSH access" but doesn't specify behavior when:
- SSH key is rejected mid-session
- Connection requires interactive auth (password/2FA)
- SSH config has complex ProxyJump chains
Implementation may hang or fail ungracefully.

**QA-30: Tmux Server Death Recovery** - OPEN  
Status: Critical edge case  
If tmux server process dies while user is connected:
- Sessions are lost but helper will still try to attach
- `tmux list-sessions` will fail after server restart
- No recovery mechanism specified for rebuilding session state

**QA-36: Filesystem Permissions Edge Cases** - NEW  
Status: Critical edge case  
The spec requires writing to ~/.local/bin but doesn't address permission issues:
- What if ~/.local doesn't exist and parent directory is read-only?
- What if ~/.local/bin exists but is owned by different user/group?
- Should the bootstrap create intermediate directories with specific permissions?

**QA-37: Disk Space Exhaustion** - NEW  
Status: Edge case  
Bootstrap writes helper script but doesn't check available disk space:
- What if filesystem is full during helper installation?
- Should there be a minimum space requirement?
- How to handle partial writes due to space exhaustion?

---

## Suggested Clarifications

**QA-21: Performance Invariants Quantification** - OPEN  
The spec states "Cold start is bounded" and "Warm start is near-immediate" but provides no metrics:
- What constitutes "bounded" (1s? 10s?)  
- "Near-immediate" relative to what baseline?
- Should there be timeout thresholds specified?

**QA-22: "Standard User Paths" Definition** - OPEN  
Layout section uses "standard user directories" but implementation shows specific XDG paths:
- Should spec explicitly require XDG Base Directory compliance?
- What about systems without XDG (older Unix)?
- Is `~/.local/bin` universally "standard"?

**QA-23: Probe Success Criteria** - OPEN  
Observability probes describe procedures but not pass/fail criteria:
- Resilience probe: how much timestamp gap indicates failure?
- Bootstrap probe: what constitutes successful helper recreation?
- Picker probe: how to verify arrow-key functionality programmatically?

**QA-24: Session Naming Conventions** - OPEN  
Spec mentions "Session naming conventions and defaults" as implementation choice, but:
- Should there be constraints (no spaces, length limits)?
- Is 'main' as default name a spec requirement or implementation detail?
- How should naming conflicts be handled?

**QA-31: Compatibility Assumptions Verification** - OPEN  
Spec lists compatibility assumptions but not verification procedures:
- How should implementation detect if tmux is available?
- What specific POSIX shell features are required?
- Should there be version requirements (tmux 2.x vs 3.x)?
- How to handle servers with restricted environments?

**QA-32: Security Invariants Enforcement** - OPEN  
Security section lists invariants but not enforcement mechanisms:
- How to ensure no privilege escalation attempts?
- What constitutes "arbitrary remote code" vs necessary code?
- Should there be input sanitization requirements?
- How to audit compliance with these invariants?

**QA-38: State Directory Usage Specification** - NEW  
Status: Clarification needed  
The spec creates `~/.local/state/ssh-keep/` for "runtime state (MRU, host/session hints)" but never defines:
- What specific state is stored there?
- When is this state created, updated, or cleaned up?
- How does this interact with the "no-stale-state" principle?
- Is this state per-host or global?

**QA-39: Error Message Standards** - NEW  
Status: Clarification needed  
The spec defines exit codes but not error message format or content:
- Should error messages be machine-parseable?
- What level of detail should be provided to users?
- How should debug/verbose modes work?
- Should errors be logged anywhere persistent?