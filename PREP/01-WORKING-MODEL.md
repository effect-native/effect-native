# Working Model

The weekly refresh should be a narrow dependency-family update from Effect
`4.0.0-beta.94` to `4.0.0-beta.97`. The primary hypothesis is that updating
`bun.lock` will reveal any real API or tooling incompatibilities through the
existing lint, docgen, and `ok` gates; those failures, rather than assumptions,
will determine whether source edits are required.

The initial assumption that the configured worktree existed was falsified. It
was reconstructed from `effect-native/effect-native`, then `v4-refresh` was
created from and rebased on `origin/v4` at `73087ca4`.
