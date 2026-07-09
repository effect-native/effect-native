# Work Orders (from .gaps/effect-refresh.md)

No active work orders for the latest effect refresh snapshot.

verification

```bash
bun run ok && test "$(gh pr list --repo effect-native/effect-native --head v4-refresh --base v4 --state open --json number --jq 'length')" = 1
```
