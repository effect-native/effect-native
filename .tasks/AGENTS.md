# Ephemeral Work Orders

We treat `.ok/` as the evergreen definition of what "ok / done / healthy" means.

Everything in `.tasks/` (except this file) is temporary: we regularly delete it
and regenerate it from scratch by comparing `.ok/` to the current repo reality.

## Golden Rule

- `.ok/**` = evergreen expectations (ideal reality)
- `.gaps/**` = latest measured reality (snapshot; overwrite in place; git is the history)
- `.tasks/**` = generated work orders to close gaps (ephemeral)

## Workflow

1. Refresh `.ok` docs when they are incorrect, or when intentionally changing the ideal.
2. Produce a gaps snapshot:
   - run each gate command from the relevant `.ok/*.md`
   - write results to `.gaps/<topic>.md`
3. Regenerate work orders from the snapshot:
   - keep it small (<= 5 items)
   - each work order includes `done_when` (a single command that exits 0)
   - include "prior attempts" notes when known (so we don't repeat dead ends)
4. Execute work orders (TDD as appropriate), then re-snapshot.

## Conventions

- Prefer a single `.tasks/work-orders.md` over many files.
- Do not store permanent decisions in `.tasks/`; move them into code, tests, or `.ok/`.
- When deleting/regenerating tasks, delete everything except `.tasks/AGENTS.md`, then regenerate `.tasks/work-orders.md`.
