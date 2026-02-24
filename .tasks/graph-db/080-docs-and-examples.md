---
title: "graph-db/080: README and examples"
status: pending
done_when: |
  see packages/graph-db/README.md
  verify: contains compile-ready usage examples for spec/layer/ensure/CRR mode
basis: |
  Pending implementation.
blocked_by:
  - .tasks/graph-db/070-repos-edges.md
artifacts:
  - path: packages/graph-db/README.md
    description: Package usage documentation.
  - path: packages/graph-db/examples/basic.ts
    description: Optional usage example (if created).
---

# Goal

Document package setup, layer wiring, ensure execution, and CRR configuration.

# Scope

- README with copy/paste examples.
- Optional `examples/` snippet if needed for clarity.

# Non-goals

- Full application integration guide.

# Acceptance Criteria

- S3: README covers node/edge schema definition and layer construction.
- S3: README explains `ensure` and CRR mode usage.
- S3: example code compiles with package exports.

# Proof Steps

1. Run `bun --filter @effect-native/graph-db run check`.
2. Verify example import paths and API names match implemented code.

