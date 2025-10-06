# Debug Research Task Tracker

All tasks follow uXP expectations: tests-first thinking, evidence-cited updates, collective ownership. Update this file whenever progress occurs.

## Active Tasks
| Task ID | Summary | Status | Last Update |
| --- | --- | --- | --- |
| task-001 | Author WebKit inspector quickstart that proves remote evaluation for Safari/Bun | DONE | 2025-09-26 |
| task-002 | Provide React Native Hermes CDP quickstart with runnable eval example | DONE | 2025-09-26 |
| task-003 | Fix Ladybird caveat and supply quickstart referencing documented RDP handshake | DONE | 2025-09-26 |
| task-004 | Produce RDP socket quickstart covering Firefox and Servo | DONE | 2025-09-26 |
| task-005 | Add Cloudflare Workers (workerd) debugging support via wrangler dev CDP | NOT STARTED | 2025-09-27 |

## Progress Log
### task-001
- 2025-09-26 primary agent: Task created after reviewing `.specs/debug/research.md:128-165` showed missing "taste-the-power" commands for Safari/Bun.
- 2025-09-26 primary agent: Attempted to spawn delegated Codex CLI agent; session failed with `401 Unauthorized`, proceeding manually.
- 2025-09-26 primary agent: Added `.specs/debug/research-webkit.md` and updated Safari/Bun quickstarts with `wscat` evaluation commands.
- 2025-09-26 primary agent: Marked DONE; quickstart now echoes `value:4` and references the new research file.

### task-002
- 2025-09-26 primary agent: Task created because `.specs/debug/research.md:167-175` lacks a Hermes eval demo despite `.specs/debug/research-react-native.md` proving CDP plumbing exists.
- 2025-09-26 primary agent: Reused existing Metro inspector knowledge; updated quickstart to fetch `webSocketDebuggerUrl` and execute `Runtime.evaluate` via `wscat`.

### task-003
- 2025-09-26 primary agent: Task opened to reconcile `.specs/debug/research.md:220-223` with `.specs/debug/research-ladybird.md:3-18` showing public RDP docs.
- 2025-09-26 primary agent: Updated support matrix + caveat to reference documented RDP server; quickstart wiring pending.
- 2025-09-26 primary agent: Added Ladybird quickstart using the shared RDP socket snippet and logging guidance from the research doc; task complete.

### task-004
- 2025-09-26 primary agent: Task added; `.specs/debug/research.md:139-145` offers only UI guidance without socket handshake evidence though `.specs/debug/research-firefox.md:3-26` details actor protocol.
- 2025-09-26 primary agent: Added Python length-prefixed RDP snippet for Firefox, Servo, and Ladybird quickstarts; verifies `listTabs` responses.

### task-005
- 2025-09-27 primary agent: Task created to add Cloudflare Workers debugging support via V8 Inspector Protocol (CDP dialect) exposed by `wrangler dev`.
- 2025-09-27 primary agent: Created comprehensive research document `.specs/debug/research-cloudflare-workers.md` covering local development inspector, production limitations, bindings inspection, and workerd-specific features.
- 2025-09-27 primary agent: Updated support matrix in `.specs/debug/research.md` to include workerd runtime with local-only CDP access.
- 2025-09-27 primary agent: Added paste-and-run quickstart showing wrangler dev inspector connection and `Runtime.evaluate` via `wscat`.
- 2025-09-27 primary agent: Created task specification `.specs/debug/tasks/task-005-cloudflare-workers-cdp.md` with EARS requirements, acceptance criteria, and integration test plans including hard-fail policy for missing wrangler.
