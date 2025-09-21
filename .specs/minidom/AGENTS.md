follow the direction at .claude/commands/new-feature.md
goal: .claude/commands/done-feature.md

you are expected to continue looping until `.specs/minidom/plan.md` shows Phase 5 complete and the goal in `.claude/commands/done-feature.md` is met.

before stopping for any reason:
- confirm `.specs/minidom/TODO.md` has no `Locked` hypotheses without an active assignee or experiment pointer
- ensure Phase progress in `.specs/minidom/plan.md` marks the current phase as **completed** (Phase 5 included)
- run the full validation braid (`pnpm lint --fix`, `pnpm docgen`, `pnpm check`, `pnpm test`, `pnpm build`) and document the results in the latest commit message
- verify there are **no** unchecked items in `.specs/minidom/plan.md` task lists
- produce a written session log in `experiments/minidom/log-YYYYMMDD-HHMM.md` summarizing work done, validation outputs, remaining hypotheses, and next steps
if any of the above are not satisfied, continue working or update the ledger/plan with a hand-off note, create the session log, and commit before pausing

we began with .specs/minidom/research.md
then we iterated on .specs/minidom/instructions.md
which allowed us to specify .specs/minidom/requirements.md
and come up with our .specs/minidom/plan.md
and our .specs/minidom/design.md
if there are any blockers, we've been tracking them in .specs/minidom/TODO.md

I expect you to work iteratively
we follow XP (eXtreme Programming) practices
keep the focus of each iteration small and focused
ensure that there are red tests for all new functionality
git commit the red phase
then focus on making those red tests green through feature work
or reject invalid tests that can't be quickly implemented; if so, add a code comment
git commit
once all tests are green (and git is clean and `pnpm ok` is happy)
then refactor as needed, while ensuring that `pnpm ok` before git commit again

keep looping like this without stopping until every `.specs/minidom/*.md` is satisfied
update the .specs/minidom/*.md as we go to track progress and follow up considerations.

each iteration (red → green → refactor) **must** include at least 30 minutes of sustained work: if you reach a stopping point earlier, immediately begin the next iteration instead of pausing. status-only updates are forbidden while there is remaining work in `.specs/minidom/plan.md`; report progress **and** immediately continue with the next concrete task. do **not** assume that writing a session log completes an iteration — begin the following task before replying.

after every commit:
- re-run the validation braid
- update commit message with the validation commands executed
- select the next unchecked item in `.specs/minidom/plan.md` and begin work **before** responding to the user (unless all items are complete)
- record a brief note in `experiments/minidom/log-YYYYMMDD-HHMM.md` **while continuing to work**; the log update is not a stopping point, just an audit trail. if the log grows past 200 lines, start a new time-stamped log file and link it in the previous file.

if you encounter a blocker that you cannot clear within the current session, record a new hypothesis in `.specs/minidom/TODO.md` with an assignee placeholder and disproof experiment path, commit that state, and then you may pause.

the absence of pending work **must** be evidenced by:
1. clean git status
2. all tests/validation commands logged in the latest commit message
3. `.specs/minidom/TODO.md` containing only `Invalidated` or `Constrained` hypotheses with future review dates
4. `experiments/minidom/log-*` latest entry explicitly stating "ready to pause" with timestamp (only after the next task has already been started and there is no remaining work)

never conclude a response with "next steps" or similar planning-only notes while outstanding plan items remain; instead, carry out the next action and report the results in the same response. log entries must coexist with continued execution; logging alone never justifies stopping.

don't allow yourself to become blocked
if anything requires attention, keep track of it somewhere and I shall follow up later
