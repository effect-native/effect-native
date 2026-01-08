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

**QA-15: Helper Script Transport Method** - NEW  
Status: Open  
The spec mentions bootstrap can be "inline heredoc, remote fetch, embedded payload, etc." but doesn't specify requirements. Current implementation uses heredoc with single quotes, but:
- Should the helper script be signed/checksummed for integrity?
- What happens if the heredoc contains the delimiter string `HELPER_EOF`?
- Is embedding the entire script in the thin client the intended approach?

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

**QA-16: Graceful Degradation Details** - NEW  
Status: Underspecified  
B8 requires graceful degradation when "fancy picker" dependencies are missing, but:
- Current implementation uses `tmux choose-tree` which is always available with tmux
- What constitutes a "fancy picker" vs basic picker?
- The fallback path isn't clearly defined in the spec

**QA-17: Session Creation Default Behavior** - NEW  
Status: Underspecified  
When auto-creating sessions (named or default 'main'), the spec doesn't specify:
- Working directory for new sessions
- Initial shell/command 
- Window naming conventions
- Whether session should start with specific tmux configuration

---

## Edge Cases

**QA-10: Multiple Attached Clients** - OPEN  
Status: Unaddressed by spec  
Tmux supports multiple clients on same session. Spec doesn't address whether this should be indicated in picker or warned about.

**QA-18: Network Interruption During Bootstrap** - NEW  
Status: Critical edge case  
If SSH connection drops while writing the helper script via heredoc:
- Helper file may be incomplete/corrupted
- Next bootstrap attempt may fail if partial file exists but isn't executable
- No verification that bootstrap completed successfully

**QA-19: Concurrent Bootstrap Attempts** - NEW  
Status: Race condition  
Multiple simultaneous SSH connections during first-run could race:
- Both try to write `~/.local/bin/ssh-keep` simultaneously  
- File corruption or partial writes possible
- No atomic installation mechanism specified

**QA-20: TTY Size Changes** - NEW  
Status: Edge case  
When client terminal resizes during picker interaction:
- Should picker adapt to new size?
- Current implementation may not handle dynamic resize gracefully
- Spec doesn't address terminal size requirements

---

## Suggested Clarifications

**QA-21: Performance Invariants Quantification** - NEW  
The spec states "Cold start is bounded" and "Warm start is near-immediate" but provides no metrics:
- What constitutes "bounded" (1s? 10s?)  
- "Near-immediate" relative to what baseline?
- Should there be timeout thresholds specified?

**QA-22: "Standard User Paths" Definition** - NEW  
Layout section uses "standard user directories" but implementation shows specific XDG paths:
- Should spec explicitly require XDG Base Directory compliance?
- What about systems without XDG (older Unix)?
- Is `~/.local/bin` universally "standard"?

**QA-23: Probe Success Criteria** - NEW  
Observability probes describe procedures but not pass/fail criteria:
- Resilience probe: how much timestamp gap indicates failure?
- Bootstrap probe: what constitutes successful helper recreation?
- Picker probe: how to verify arrow-key functionality programmatically?

**QA-24: Session Naming Conventions** - NEW  
Spec mentions "Session naming conventions and defaults" as implementation choice, but:
- Should there be constraints (no spaces, length limits)?
- Is 'main' as default name a spec requirement or implementation detail?
- How should naming conflicts be handled?