# @effect-native/wrp

Minimal wish/wrapper control-plane CLI for promptgraph workspaces. The `wrp` binary manages markdown-backed wishes so teams can capture tasks and evaluate them quickly.

## Usage

Run commands from the root of a wrapper workspace (any directory on disk):

```bash
pnpm wrp init
pnpm wrp add wish "Review PR 123"
pnpm wrp list --tag=tomorrow
pnpm wrp eval w-use-system-tomorrow
```

### Commands

- `wrp init` – create the `promptgraph/` and `targets/` layout plus a starter wish.
- `wrp add wish [title]` – add a new wish, optionally prompting for a title.
- `wrp list [--tag=tag] [--status=status]` – list wishes filtered by kind, tag, or status.
- `wrp show <id>` – show a node’s frontmatter and body.
- `wrp eval <id>` – walk through manual evaluation steps and update `claimStatus`.
- `wrp repo list` – list configured external repositories from `targets/repos.yaml`.
