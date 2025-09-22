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

while we are building out MiniDomX (`.specs/minidom/plan.md` section 3), every schema iteration must:
- introduce RED coverage in `packages-native/minidom/test/` before touching `src/schema`; tie the test description back to the specific FR / SC identifier in the plan or TODO ledger
- surface new helpers through the public exports (`packages-native/minidom/src/index.ts`) and update `package.json` subpath mappings when new entry points are required
- log the evidence and validation braid in `experiments/minidom/log-*.md` using the same timestamped file for the current day, adding cross-links if the log grows beyond 200 lines
- refresh `.specs/minidom/plan.md` immediately after the GREEN commit so Schema tasks remain traceable and status stays accurate

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

### continuous iteration accounting
- log the start time, iteration number, target plan item, and expected red test path in `experiments/minidom/log-*.md` **before** editing source files; keep the timer running and record the elapsed minutes when closing the entry.
- track overlaps explicitly: if an iteration spills into the next task, duplicate the start data under a new heading and mark the prior entry as "rolled forward" so there is never ambiguity about which 30-minute window produced which artifacts.
- whenever the log exceeds 200 lines, append a `Continued in <new-log-file>` notice pointing to the new file and carry over the active iteration details verbatim so the chain of custody stays intact.

### evidence discipline
- every validation braid invocation must capture command + exit code in the session log and in the commit trailer block (e.g., `Validation: pnpm lint --fix … ✅`). if a command fails, document the failure output, corrective action, and re-run evidence in the same log entry before moving on.
- cross-reference hypotheses: when a test fails or succeeds, immediately note the impacted hypothesis IDs in `.specs/minidom/TODO.md` and the log entry so reviewers can trace evidence without guesswork.
- do not defer documentation—update `.specs/minidom/plan.md`, the session log, and any impacted hypothesis rows in real time while the context is still warm; retroactive summaries are forbidden.

### response protocol
- each status update must cite the exact log filename and timestamped section that captures the work performed since the previous response; responses lacking these anchors violate the audit trail.
- report concrete code or doc changes **and** state the next action already in flight (e.g., the file currently open for the following red test). there is no gap between observation and action.
- ensure the pair-programming partner or reviewer can resume instantly: include open editor locations, failing test names, and running command contexts so no momentum is lost if hand-off becomes necessary.

### guardrail audits
- schedule a guardrail self-audit every third iteration: review `.specs/minidom/AGENTS.md` against the latest log/bookkeeping and add a log entry confirming compliance gaps or fixes before starting new work.
- if any guardrail is breached (missing validation trailer, absent log link), stop forward progress until the breach is documented and corrected; log the remediation steps with timestamps.
- maintain a running checklist in the session log noting the last audit timestamp and upcoming audit deadline; missing audits are treated as blockers and must be resolved before responding to the user.
