---
title: Debug POC Demo - Connect, Breakpoint, Read State
status: blocked
done_when: |
  all subtasks complete:
  - bun test todomvc/tests/
  - node packages-native/debug/poc/debug-todomvc.ts runs successfully
  - demonstrates: connect to todomvc app, set breakpoint, read runtime state
basis: |
  Blocked by GOAL-todomvc-effect-atom which must provide a debuggable demo application.
blocked_by:
  - .tasks/GOAL-todomvc-effect-atom.md
artifacts:
  - path: packages-native/debug/poc/debug-todomvc.ts
    description: POC script that connects to todomvc, sets breakpoint, reads state
---

# GOAL: Debug POC Demo

## Summary

Create a proof-of-concept demonstration of using `@effect-native/debug` to:

1. Connect to a running application (the effect-atom TodoMVC app)
2. Set a breakpoint in the application code
3. Read runtime state from within the application context

This proves the debug package can be used for real debugging workflows, not just stepping through code.

## Why This Matters

The existing debug demos (`test-fixtures/debug-step-through.ts`) prove that step-through works, but they don't demonstrate the full debugging workflow that developers actually need:

- Connecting to a **real application** (not just a test fixture)
- Setting breakpoints at **specific locations** of interest
- Reading **application state** (atoms, variables, etc.) when paused

This POC bridges the gap between "the debug service works" and "here's how you'd actually use it."

## Success Criteria

1. TodoMVC app runs with `--inspect-brk` or `--inspect`
2. POC script connects to the inspector endpoint
3. POC script sets a breakpoint (e.g., in the addTodo handler)
4. POC script reads application state when paused:
   - The current todo list (from effect-atom state)
   - Local variables in the paused function
   - Call stack information
5. POC script resumes and disconnects cleanly

## Subtasks

See blocking GOAL:
- `.tasks/GOAL-todomvc-effect-atom.md` - Must be complete first

Then implementation:
- `.tasks/impl/debug-todomvc-poc.md` - POC script implementation

## Non-Goals

- Full production-ready debugging tool
- Memory profiling (that's a separate feature)
- GUI or interactive REPL (this is a scripted POC)
