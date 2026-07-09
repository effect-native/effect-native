# Stress Test

- What if `effect@beta` moves again before the weekly run starts? Re-read npm dist-tags at execution time and record the concrete version in `.gaps/effect-refresh.md`.
- What if `effect-smol` has untracked local files? Use fast-forward-only Git operations and preserve untracked files.
- What if Bun updates unrelated package ranges while refreshing beta packages? Inspect `package.json` and lockfile diffs; remove accidental manifest additions.
- What if native SQLite dependencies fail after the beta update? Keep failures loud and use the Nix recovery path from `AGENTS.md`; do not add conditional skips.
- What if an upstream API changes again? Search `effect-smol` migration docs and source first, then apply the smallest package-local migration.
