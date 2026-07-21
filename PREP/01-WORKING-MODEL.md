# Working Model

The weekly refresh should be a narrow dependency-family update from Effect
`4.0.0-beta.97` to `4.0.0-beta.99`. The primary hypothesis is that updating
`bun.lock` will reveal any real API or tooling incompatibilities through the
existing lint, docgen, and `ok` gates; those failures, rather than assumptions,
will determine whether source edits are required.

That model survived: the four required packages resolve at beta.99 and all
CI-equivalent gates pass without source edits. The assumption that a root-level
targeted `bun update` would preserve workspace ownership was falsified; the
working resolver path is a workspace-filtered beta update followed by removal
of Bun's incidental root dependency entries.
