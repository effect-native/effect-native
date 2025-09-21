follow the direction at .claude/commands/new-feature.md
goal: .claude/commands/done-feature.md

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

don't allow yourself to become blocked
if anything requires attention, keep track of it somewhere and I shall follow up later
