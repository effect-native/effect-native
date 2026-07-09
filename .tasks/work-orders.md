# Work Orders (from .gaps/effect-refresh.md)

1. Finish the beta.94 refresh proof and PR handoff.

   done_when

   ```bash
   bun run ok && test "$(gh pr list --repo effect-native/effect-native --head v4-refresh --base v4 --state open --json number --jq 'length')" = 1
   ```
