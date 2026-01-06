# @effect-native/gaps - Instructions

## Context

Software systems are designed for creation and handoff, but serious work is 0.00001% creation and (infinity - 1)% long-term maintenance. Nature's systems last forever because they are designed for continuous self-maintenance (homeostasis), not one-time creation.

Current development practices treat "done" as a state rather than an ongoing process. This leads to:

- Systems that drift from their intended state
- Manual work to detect and fix drift
- No systematic way to ensure invariants hold over time
- Gaps between desired state and actual state that grow silently

## User Story

As Tom, Bramwell, or one of their agents working as an elite mini-squad, I want a system that continuously detects and closes gaps between desired state and actual state, so that our systems maintain themselves indefinitely rather than requiring constant manual vigilance.

## High-Level Goals

- **Continuous self-maintenance** - Systems detect their own gaps and work to close them
- **Gaps as first-class concept** - The delta between desired and actual state is explicitly modeled
- **Rules define desired state** - Invariants are expressed as rules that produce gaps when violated
- **Resolutions close gaps** - Automated or delegated work that restores desired state
- **Actors with capabilities** - Work is delegated to actors (human, AI, or other) based on their capabilities
- **Fallback actor** - Bramwell is the catchall actor when no capable worker is available
- **Pit-of-success defaults** - Sensible defaults that work out of the box
- **Pluggable everything** - All components can be overridden following Effect-TS service patterns
- **Fully testable** - All services behind interfaces for isolation testing

## Target Users

Tom, Bramwell, and their agents - a niche elite mini-squad that works tightly together. This is a personal tool, not a general-purpose public library (yet).

The system supports:

- Manual work (Bramwell)
- One-shot AI work
- Full agentic swarms
- Delegation to other people

## Technical Foundation

Built on Effect-TS, following all standard patterns:

- Services and layers
- Tagged errors
- Effect.gen
- Dependency injection
- Testable by design

## Initial Focus

While the pattern is general, initial implementation targets filesystem-specific use cases (FSDB). We will refactor to extract generic pieces as needed, avoiding the trap of over-engineering before version 0.

## Out of Scope

- Full automation (humans will always be in some loop somewhere)
- Public-facing library polish (this is for us first)
- Over-generalization before v0
- Non-Effect-TS implementations
