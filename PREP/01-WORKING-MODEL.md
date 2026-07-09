# Working Model: Effect v4 Beta Refresh

## Initial Hypothesis

I expected this refresh to be mostly lockfile movement because workspace manifests already use `effect: beta` and the root override pins `effect` to `beta`.

## Bayesian Update

The lockfile update from 4.0.0-beta.29 to 4.0.0-beta.94 exposed real API drift:

- `effect/ServiceMap` was removed and replaced by `effect/Context` service constructors.
- `Schema.Struct.makeUnsafe` was removed; constructor-side validation now uses `.makeEffect`.
- `SqlError` now requires a structured `reason` such as `SqlError.UnknownError`.

The model for future refreshes is: expect lockfile drift first, then run `bun run check` immediately to reveal upstream API movement, then use `/Users/tom/Work/refs/effect-smol` as the source-level reference for migrations.
