# Debug Research Task Tracker

All tasks follow uXP expectations: tests-first thinking, evidence-cited updates, collective ownership. Update this file whenever progress occurs.

## Active Tasks
| Task ID | Summary | Status | Last Update |
| --- | --- | --- | --- |
| task-001 | Author WebKit inspector quickstart that proves remote evaluation for Safari/Bun | DONE | 2025-09-26 |
| task-002 | Provide React Native Hermes CDP quickstart with runnable eval example | DONE | 2025-09-26 |
| task-003 | Fix Ladybird caveat and supply quickstart referencing documented RDP handshake | DONE | 2025-09-26 |
| task-004 | Produce RDP socket quickstart covering Firefox and Servo | DONE | 2025-09-26 |
| task-005 | Add Cloudflare Workers (workerd) debugging support via wrangler dev CDP | NOT STARTED | 2025-10-06 |
| task-006 | Implement memory debugging and profiling (heap snapshots, allocation tracking, GC monitoring) | NOT STARTED | 2025-10-06 |
| task-007 | Implement safe stepping and blackboxing to prevent V8 crashes and skip third-party code | READY | 2025-10-07 |

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
- 2025-10-06 primary agent: Task created to add Cloudflare Workers debugging support via V8 Inspector Protocol (CDP dialect) exposed by `wrangler dev`.
- 2025-10-06 primary agent: Created comprehensive research document `.specs/debug/research-cloudflare-workers.md` covering local development inspector, production limitations, bindings inspection, and workerd-specific features.
- 2025-10-06 primary agent: Updated support matrix in `.specs/debug/research.md` to include workerd runtime with local-only CDP access.
- 2025-10-06 primary agent: Added paste-and-run quickstart showing wrangler dev inspector connection and `Runtime.evaluate` via `wscat`.
- 2025-10-06 primary agent: Created task specification `.specs/debug/tasks/task-005-cloudflare-workers-cdp.md` with EARS requirements, acceptance criteria, and integration test plans including hard-fail policy for missing wrangler.
- 2025-10-06 primary agent: Added production observability research in `.specs/debug/research-cloudflare-workers-production.md` covering 128MB-per-isolate memory limit, CPU limits, tail workers, streaming patterns, and production debugging strategies.

### task-006
- 2025-10-06 primary agent: Task created to implement comprehensive memory debugging capabilities including heap snapshots, allocation tracking, GC monitoring, and leak detection.
- 2025-10-06 primary agent: Created extensive research document `.specs/debug/research-memory.md` (787 lines) covering heap snapshot format, allocation tracking, GC monitoring, leak detection techniques, protocol-specific APIs (CDP HeapProfiler, WebKit Heap, Firefox RDP memory actor), and cross-runtime considerations.
- 2025-10-06 primary agent: Added paste-and-run examples for all major runtimes: Chrome/Node.js heap snapshots via CDP, Deno heap statistics, Cloudflare Workers sampling profiler, Safari/Bun WebKit snapshots, Firefox RDP memory actor, and programmatic snapshot analysis.
- 2025-10-06 primary agent: Updated core instructions in `.specs/debug/instructions.md` to include memory profiling requirements (EARS requirements for Memory-Aware and Stream-Based capabilities, acceptance criteria AC-M2/AC-S2/AC-M3, testing requirements for heap snapshot streaming).
- 2025-10-06 primary agent: Created task specification `.specs/debug/tasks/task-006-memory-debugging.md` with detailed EARS requirements, streaming architecture design, schema definitions for HeapUsage/SamplingProfile, acceptance criteria covering snapshot streaming without buffering, cross-runtime compatibility tests, and integration examples for leak detection workflows.
- 2025-10-06 primary agent: Created demo package `packages-native/debug-demos` with working memory leak demos (Node.js and Cloudflare Workers), comprehensive guides (BLOG-POST.md, WORKERS-MEMORY-GUIDE.md), and automated leak detector implementing three-snapshot technique.

### task-007
- 2025-10-07 primary agent: Task created after discovering V8 inspector crash when using `Debugger.stepInto` in Node.js v24.8.0 with ESM/async code during implementation of `pnpm test:debug-log-steps` demo.
- 2025-10-07 primary agent: Root cause identified: stepping into async boundaries and module evaluation contexts triggers V8 inspector crash: "Check failed: needs_context && current_scope_ == closure_scope_".
- 2025-10-07 primary agent: Solution discovered: Use `Debugger.stepOver` instead of `stepInto`, OR use blackboxing to prevent stepping into problematic contexts.
- 2025-10-07 primary agent: Created working demo `packages-native/debug/test-fixtures/debug-step-through.ts` that steps through `broken-simple.js` and logs each line execution (file:line:column + source code) without crashing.
- 2025-10-07 primary agent: Demo successfully shows 27 steps through broken-simple.js with clean exit, demonstrating that @effect-native/debug service works for real debugging scenarios.
- 2025-10-07 primary agent: Created comprehensive research document `.specs/debug/research-safe-stepping.md` (795 lines) covering:
  * V8 inspector crash patterns and triggers
  * CDP blackboxing API (setBlackboxPatterns, setBlackboxedRanges)
  * Safe stepping heuristics (URL checking, dynamic stepOut/resume)
  * Common blackbox patterns for Node.js, browsers, Workers, frameworks
  * Protocol comparison (CDP, WebKit, Firefox RDP)
  * Preventing infinite stepping loops (step limits, timeouts, line limits)
  * Best practices for production debugging
  * Integration patterns with @effect-native/debug
- 2025-10-07 primary agent: Updated core instructions `.specs/debug/instructions.md` to include Safe-Stepping and Selective-Debug EARS requirements, new acceptance criteria AC-SS1/AC-SS2/AC-SS3 for blackboxing and safe stepping.
- 2025-10-07 primary agent: Created task specification `.specs/debug/tasks/task-007-safe-stepping.md` with EARS requirements for safe stepping, blackboxing support, step limits, acceptance criteria with Effect code examples, API design for BlackboxingSupport and SafeSteppingSupport interfaces, predefined blackbox pattern sets, and integration test specifications.

## Next Steps

1. Implement memory debugging (task-006): HeapProfiler domain w