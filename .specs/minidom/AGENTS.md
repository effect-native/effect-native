follow the direction at .claude/commands/new-feature.md
goal: .claude/commands/done-feature.md

before stopping for any reason:
- confirm `.specs/minidom/TODO.md` has no `Locked` hypotheses without an active assignee or experiment pointer
- ensure Phase progress in `.specs/minidom/plan.md` marks the current phase as completed
- run the full validation braid (`pnpm lint --fix`, `pnpm docgen`, `pnpm check`, `pnpm test`, `pnpm build`) and leave the results in commit notes
if any of the above are not satisfied, continue working or update the ledger/plan with a hand-off note and commit

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

if you encounter a blocker that you cannot clear within the current session, record a new hypothesis in `.specs/minidom/TODO.md` with an assignee placeholder and disproof experiment path, commit that state, and then you may pause.

the absence of pending work **must** be evidenced by:
1. clean git status
2. all tests/validation commands logged in the latest commit message
3. `.specs/minidom/TODO.md` containing only `Invalidated` or `Constrained` hypotheses with future review dates

don't allow yourself to become blocked
if anything requires attention, keep track of it somewhere and I shall follow up later
