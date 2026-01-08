# @effect-native/gaps - Requirements Specification

## Overview

This document specifies the product requirements for `@effect-native/gaps`, a homeostatic reconciliation engine for Effect-TS. Requirements are written in EARS (Easy Approach to Requirements Syntax) notation.

**Version**: 0.1.0 (v0)  
**Date**: 2026-01-07  
**Status**: Draft  
**Derived From**: `analysis/RECONCILED-REQUIREMENTS.md`

---

## FR1: Functional Requirements

### FR1.1: Rule System

#### FR1.1.1: Rule Definition
FR1.1.1.1: The system shall accept rules as functions with signature `(context: Context) => Effect<Gap[], RuleError, R>`.

FR1.1.1.2: The system shall require each rule to have a string identifier for logging and debugging.

FR1.1.1.3: The system shall pass a single context object containing all dependencies to each rule.

FR1.1.1.4: WHEN a rule returns an empty array the system shall treat the rule as passing (no gaps detected).

FR1.1.1.5: WHEN a rule returns a non-empty array the system shall treat each element as a detected gap.

#### FR1.1.2: Rule Execution
FR1.1.2.1: The system shall execute all registered rules during each reconciliation iteration.

FR1.1.2.2: The system shall execute rules sequentially in registration order.

FR1.1.2.3: IF a rule throws an error THEN the system shall log the error with rule identifier and continue executing remaining rules.

FR1.1.2.4: IF a rule exceeds a configured timeout THEN the system shall terminate the rule execution and log a timeout error.

FR1.1.2.5: The system shall collect all gaps from all rules before proceeding to resolution.

#### FR1.1.3: Rule Registration
FR1.1.3.1: The system shall accept rule registration at engine initialization time.

FR1.1.3.2: The system shall reject duplicate rule identifiers with a clear error message.

FR1.1.3.3: The system shall validate rule signatures at registration time where possible.

---

### FR1.2: Gap System

#### FR1.2.1: Gap Structure
FR1.2.1.1: The system shall require each gap to have a `_tag` field identifying its type.

FR1.2.1.2: The system shall support gaps as Effect-TS `Data.TaggedClass` instances.

FR1.2.1.3: The system shall allow gaps to contain arbitrary additional data fields.

#### FR1.2.2: Gap Identity
FR1.2.2.1: The system shall compute gap identity deterministically from `_tag` and identity-contributing fields.

FR1.2.2.2: WHEN a gap type declares explicit identity fields the system shall use only those fields for identity computation.

FR1.2.2.3: WHEN a gap type does not declare explicit identity fields the system shall use `_tag` plus all fields for identity computation.

FR1.2.2.4: The system shall produce identical identity values for gaps with identical identity-contributing data.

FR1.2.2.5: The system shall preserve gap identity across serialization and deserialization.

#### FR1.2.3: Gap Deduplication
FR1.2.3.1: The system shall deduplicate gaps with identical identity within a reconciliation run.

FR1.2.3.2: WHEN multiple rules produce gaps with identical identity the system shall retain one representative gap.

FR1.2.3.3: The system shall log when deduplication occurs for debugging purposes.

#### FR1.2.4: Gap Status
FR1.2.4.1: The system shall track gap status as one of: `unresolved`, `escalated`, or `resolved`.

FR1.2.4.2: The system shall initialize all detected gaps with status `unresolved`.

FR1.2.4.3: WHEN a resolution successfully handles a gap the system shall change its status to `resolved`.

FR1.2.4.4: WHEN a gap is escalated to Bramwell the system shall change its status to `escalated`.

---

### FR1.3: Resolution System

#### FR1.3.1: Resolution Definition
FR1.3.1.1: The system shall accept resolutions as functions with signature `(gap: Gap) => Effect<void, ResolutionError, R>`.

FR1.3.1.2: The system shall require each resolution to declare the gap type(s) it handles via `_tag`.

FR1.3.1.3: WHEN a resolution succeeds (returns void) the system shall mark the gap as resolved.

FR1.3.1.4: WHEN a resolution fails (throws error) the system shall log the failure and proceed to fallback handling.

#### FR1.3.2: Resolution Matching
FR1.3.2.1: The system shall match gaps to resolutions by exact `_tag` match.

FR1.3.2.2: The system shall support at most one resolution per gap type.

FR1.3.2.3: IF multiple resolutions are registered for the same `_tag` THEN the system shall reject the duplicate registration with a clear error.

FR1.3.2.4: The system shall execute resolution matching after all rules have been evaluated.

#### FR1.3.3: Resolution Execution
FR1.3.3.1: The system shall execute resolutions sequentially.

FR1.3.3.2: The system shall execute each matched resolution exactly once per gap instance.

FR1.3.3.3: IF a resolution fails THEN the system shall not retry automatically.

FR1.3.3.4: IF a resolution fails THEN the system shall escalate the gap to Bramwell.

#### FR1.3.4: Fallback Behavior
FR1.3.4.1: WHEN no resolution matches a gap the system shall escalate the gap to Bramwell.

FR1.3.4.2: The system shall never silently drop a gap without resolution or escalation.

FR1.3.4.3: The system shall log all escalations with gap details for auditability.

---

### FR1.4: Escalation System

#### FR1.4.1: Escalation Triggering
FR1.4.1.1: WHEN a gap has no matching resolution the system shall trigger escalation.

FR1.4.1.2: WHEN a resolution fails for a gap the system shall trigger escalation.

FR1.4.1.3: The system shall escalate all unresolved gaps to Bramwell (the human fallback).

#### FR1.4.2: Work Order Creation
FR1.4.2.1: WHEN a gap is escalated the system shall create a work order via the WorkOrderSink service.

FR1.4.2.2: The system shall include in each work order: gap type, gap data, originating rule identifier, and timestamp.

FR1.4.2.3: WHEN a resolution was attempted and failed the system shall include the failure reason in the work order.

FR1.4.2.4: The system shall generate a unique work order identifier for each escalated gap.

#### FR1.4.3: Escalation Semantics
FR1.4.3.1: WHEN escalation succeeds the system shall mark the gap status as `escalated`.

FR1.4.3.2: The system shall treat escalated gaps as "handled" for loop termination purposes.

FR1.4.3.3: IF work order creation fails THEN the system shall retry up to 3 times with exponential backoff.

FR1.4.3.4: IF work order creation fails after retries THEN the system shall log a critical error and mark the gap as unresolved.

---

### FR1.5: Reconciliation Loop

#### FR1.5.1: Loop Execution
FR1.5.1.1: The system shall execute reconciliation as an iterative loop: evaluate rules, collect gaps, execute resolutions, repeat.

FR1.5.1.2: WHILE actionable gaps remain the system shall continue iterating.

FR1.5.1.3: The system shall deduplicate gaps at the start of each iteration.

FR1.5.1.4: The system shall track which gaps are new versus carried over from previous iterations.

#### FR1.5.2: Loop Termination
FR1.5.2.1: WHEN no new actionable gaps are detected the system shall terminate with reason `stable`.

FR1.5.2.2: WHEN only escalated gaps remain the system shall terminate with reason `stable`.

FR1.5.2.3: WHEN the iteration count exceeds the configured maximum the system shall terminate with reason `max_iterations`.

FR1.5.2.4: IF a fatal error occurs THEN the system shall terminate with reason `error` and include error details.

FR1.5.2.5: The system shall default to a maximum of 10 iterations.

FR1.5.2.6: The system shall allow configuration of the maximum iteration count.

#### FR1.5.3: Loop Result
FR1.5.3.1: WHEN the loop terminates the system shall return a result containing: termination reason, iteration count, and final gap states.

FR1.5.3.2: The system shall include all resolved gaps in the result.

FR1.5.3.3: The system shall include all escalated gaps in the result.

FR1.5.3.4: IF termination reason is `max_iterations` THEN the system shall include remaining unresolved gaps in the result.

---

### FR1.6: Engine Lifecycle

#### FR1.6.1: Initialization
FR1.6.1.1: The system shall accept rules, resolutions, and configuration at initialization.

FR1.6.1.2: The system shall validate all registrations before allowing reconciliation to start.

FR1.6.1.3: IF required configuration is missing THEN the system shall fail initialization with a descriptive error.

#### FR1.6.2: Execution Modes
FR1.6.2.1: The system shall support a `reconcile` mode that runs the full loop.

FR1.6.2.2: The system shall support an `assess` mode that runs rules once without executing resolutions.

FR1.6.2.3: WHEN in assess mode the system shall return detected gaps without modification.

---

## FR2: Service Architecture

### FR2.1: WorkOrderSink Service

FR2.1.1: The system shall define a `WorkOrderSink` service interface for writing work orders.

FR2.1.2: The system shall provide a default `WorkOrderSink` implementation that writes to the filesystem.

FR2.1.3: The system shall allow callers to provide custom `WorkOrderSink` implementations via Layer composition.

FR2.1.4: The `WorkOrderSink` interface shall define a `write(workOrder: WorkOrder) => Effect<void, WorkOrderError>` operation.

### FR2.2: Default Services

FR2.2.1: The system shall provide an `Engine.Default` layer that includes all required services with sensible defaults.

FR2.2.2: The system shall use Effect's built-in logging for the default Logger service.

FR2.2.3: The system shall use an in-memory store for gap tracking within a reconciliation run.

FR2.2.4: The system shall use the real system clock for timestamps.

### FR2.3: Service Composition

FR2.3.1: The system shall allow individual services to be overridden via Effect Layer composition.

FR2.3.2: WHEN a custom layer is provided the system shall merge it with defaults, preferring custom implementations.

FR2.3.3: The system shall provide an `Engine.Test` layer with in-memory implementations suitable for testing.

---

## NFR2: Non-Functional Requirements

### NFR2.1: Performance

NFR2.1.1: The system shall complete a single rule evaluation in under 100ms for typical rule complexity.

NFR2.1.2: The system shall support reconciliation runs with up to 100 rules without degradation.

NFR2.1.3: The system shall support reconciliation runs producing up to 1000 gaps without memory issues.

NFR2.1.4: The system shall complete typical reconciliation loops (10 rules, 50 gaps) in under 5 seconds.

### NFR2.2: Reliability

NFR2.2.1: The system shall never silently lose a detected gap.

NFR2.2.2: The system shall never terminate without reporting termination reason.

NFR2.2.3: The system shall be deterministic: same inputs shall produce same outputs.

NFR2.2.4: The system shall isolate rule failures so one failing rule does not affect others.

### NFR2.3: Usability

NFR2.3.1: The system shall provide clear error messages identifying the source of failures.

NFR2.3.2: The system shall log sufficient context for debugging without excessive verbosity.

NFR2.3.3: The system shall work with zero configuration using `Engine.Default`.

NFR2.3.4: The system shall provide TypeScript types for all public APIs.

### NFR2.4: Testability

NFR2.4.1: The system shall allow rules to be tested in isolation without the engine.

NFR2.4.2: The system shall allow resolutions to be tested in isolation without the engine.

NFR2.4.3: The system shall provide test utilities for creating synthetic gaps.

NFR2.4.4: The `Engine.Test` layer shall allow inspection of internal state after reconciliation.

---

## TC3: Technical Constraints

TC3.1.1: The system shall be implemented in TypeScript targeting ES2022 or later.

TC3.1.2: The system shall use Effect-TS as its foundation for effects, errors, and services.

TC3.1.3: The system shall have zero runtime dependencies beyond Effect-TS and its peer dependencies.

TC3.1.4: The system shall compile without errors under strict TypeScript configuration.

TC3.1.5: The system shall not use global mutable state.

TC3.1.6: The system shall not perform side effects outside of Effect's control.

TC3.1.7: The system shall be compatible with Node.js 18+ and Bun 1.0+.

---

## DR4: Data Requirements

### DR4.1: Gap Data Structure

DR4.1.1: Gaps shall be represented as Effect-TS `Data.TaggedClass` instances.

DR4.1.2: Gap identity shall be representable as a string for logging and serialization.

DR4.1.3: Gap status shall be represented as a discriminated union: `"unresolved" | "escalated" | "resolved"`.

### DR4.2: Work Order Data Structure

DR4.2.1: Work orders shall contain: id, gap type, gap data, rule id, timestamp, and optional resolution failure.

DR4.2.2: Work orders shall be serializable to JSON for filesystem storage.

DR4.2.3: Work order identifiers shall be unique within a reconciliation run.

### DR4.3: Result Data Structure

DR4.3.1: Reconciliation results shall contain: termination reason, iteration count, resolved gaps, escalated gaps, and unresolved gaps.

DR4.3.2: Termination reason shall be one of: `"stable"`, `"max_iterations"`, or `"error"`.

DR4.3.3: IF termination reason is `"error"` THEN the result shall include error details.

---

## IR5: Integration Requirements

IR5.1.1: The system shall integrate with Effect-TS Layer system for dependency injection.

IR5.1.2: The system shall integrate with Effect-TS error handling (tagged errors).

IR5.1.3: The system shall integrate with Effect-TS logging (Logger service).

IR5.1.4: The system shall integrate with Effect-TS scheduling (timeout, interruption).

IR5.1.5: The system shall be usable as an npm package via standard import.

---

## DEP6: Dependencies

DEP6.1.1: The system shall depend on `effect` (peer dependency, version ^3.0.0).

DEP6.1.2: The system shall depend on `@effect/platform` for filesystem operations in default implementations.

DEP6.1.3: The system shall have no other runtime dependencies.

---

## SC7: Success Criteria

### SC7.1: Functional Completeness

SC7.1.1: The system shall pass all defined acceptance tests for rule execution.

SC7.1.2: The system shall pass all defined acceptance tests for gap detection and deduplication.

SC7.1.3: The system shall pass all defined acceptance tests for resolution matching and execution.

SC7.1.4: The system shall pass all defined acceptance tests for escalation to Bramwell.

SC7.1.5: The system shall pass all defined acceptance tests for loop termination conditions.

### SC7.2: User Acceptance

SC7.2.1: Tom shall be able to write and register a new rule in under 5 minutes.

SC7.2.2: Tom shall be able to run a reconciliation loop with zero configuration using defaults.

SC7.2.3: Bramwell shall be able to view escalated work orders in the filesystem.

SC7.2.4: Agents shall be able to programmatically invoke reconciliation and inspect results.

### SC7.3: Quality Gates

SC7.3.1: The system shall achieve 100% TypeScript type coverage for public APIs.

SC7.3.2: The system shall achieve at least 80% code coverage from automated tests.

SC7.3.3: The system shall pass ESLint with zero errors.

SC7.3.4: The system shall pass all CI checks before release.

---

## Appendix A: EARS Pattern Reference

| Pattern | Syntax | Usage |
|---------|--------|-------|
| Ubiquitous | "The system shall..." | Always active, no preconditions |
| Event-driven | "WHEN [event] the system shall..." | Triggered by specific events |
| State-driven | "WHILE [state] the system shall..." | Active during specific states |
| Unwanted | "IF [condition] THEN the system shall..." | Error handling, edge cases |
| Optional | "WHERE [feature] the system shall..." | Conditional on configuration |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Rule** | A function that detects gaps by inspecting context |
| **Gap** | A detected drift between desired and actual state |
| **Resolution** | A handler that attempts to close a gap |
| **Escalation** | Handing a gap to Bramwell when automation cannot handle it |
| **Bramwell** | The human fallback actor who receives escalated gaps |
| **Work Order** | An artifact created for escalated gaps containing actionable context |
| **Stable** | The goal state where no actionable gaps remain |
| **Reconciliation Loop** | The iterative process of detecting and closing gaps |

---

## Appendix C: Traceability Matrix

| Requirement | Source Gap | Lens Agreement |
|-------------|------------|----------------|
| FR1.1.x | gap-009 | All 5 lenses |
| FR1.2.x | gap-010 | All 5 lenses |
| FR1.3.x | gap-011 | All 5 lenses |
| FR1.4.x | gap-014 | All 5 lenses |
| FR1.5.x | gap-013 | All 5 lenses |
| FR2.x | gap-016 | All 5 lenses |
| (Actor model deferred) | gap-012 | All 5 lenses |
| (Concurrency deferred) | gap-015 | All 5 lenses |
