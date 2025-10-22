# @effect/money Specification: Plan

## Milestones

### M1 – Specification Finalization
- [ ] Review instructions, requirements, and design documents with Effect core maintainers and community financial-domain SMEs.
- [ ] Resolve open questions regarding real-time payment coverage, multi-leg transaction modeling, and regulatory metadata.
- [ ] Produce example JSON fixtures and schema diagrams for each core entity.
- [ ] Publish capability taxonomy draft for community feedback.

### M2 – Core Package Implementation (`@effect/money`)
- [ ] Scaffold package structure and exports consistent with `@effect/platform` conventions.
- [ ] Implement `Schema/Common` primitives and branded identifiers.
- [ ] Implement entity schemas (Institution, Party, Account, Instrument, Transaction, Balance, Statement, Mandate, Transfer, StandingInstruction, Obligation, ExchangeRate).
- [ ] Implement capability descriptors and matrix utilities.
- [ ] Define `Data.TaggedError` hierarchies for each service domain.
- [ ] Define service interfaces with method signatures, capability negotiation helpers, and documentation.
- [ ] Prototype obligation modeling playbooks that cover evergreen rent, consumption-indexed utilities, amortizing loans, tax escrows, and hybrid insurance-investment policies with shared abstractions.
- [ ] Draft contract-test interfaces for downstream drivers.

### M3 – Supporting Packages
- [ ] Implement `@effect/money-client` with validation helpers, pagination utilities, and testing harness skeletons.
- [ ] Implement `@effect/money-storage` interfaces (`CredentialStore`, `SyncStateStore`, `TransferStore`, `AuditEventSink`).
- [ ] Provide mock/in-memory reference implementations for testing.
- [ ] Document Layer composition examples for applications.
- [ ] Extend contract-test scenarios to include recurring obligation forecasting, reconciliation of billed vs. actual amounts, and lifecycle edge cases (delinquency, payoff, renegotiation).

### M4 – Pilot Driver & Persistence Integrations (Stretch Goal)
- [ ] Choose one aggregator (e.g., Plaid sandbox) to validate account/transaction flows.
- [ ] Build reference driver showcasing schema mappings, error handling, and capability declaration.
- [ ] Implement example persistence adapter (e.g., SQLite or file-based) for stores.
- [ ] Run contract test suite to verify compliance.

## Workstreams

1. **Schema Authoring** – Owns schema fidelity, invariants, and documentation. Coordinates with driver teams for coverage.
2. **Service Contracts** – Defines Effect services, errors, and capability negotiation patterns. Ensures ergonomic layering.
3. **Testing & Tooling** – Builds contract-test harness, fixtures, and developer experience utilities.
4. **Compliance & Audit** – Ensures consent, jurisdiction, and audit requirements are captured across schemas and services.

Each workstream will track tasks in the repository project board once the specification is accepted.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Divergent institution data models make a single schema unwieldy | High | Provide extensible `extensions` envelopes and encourage optional fields; iterate with driver authors early. |
| Regulatory requirements differ by region | Medium | Model jurisdiction metadata explicitly and allow pluggable compliance validators. |
| Contract tests become too heavyweight for driver authors | Medium | Offer modular test suites and documented minimum compliance sets. |
| Capability taxonomy drifts over time | Medium | Establish governance process (RFC or ADR) for introducing new capabilities. |
| Obligation scenarios diverge across industries | Medium | Provide canonical obligation archetypes (subscription, utility, debt, insurance) with extension hooks and encourage driver-authored examples. |

## Next Actions

- [ ] Schedule design review with platform maintainers.
- [ ] Collect sample payloads from existing integrations (Plaid, Teller, Stripe Treasury, Wise, IBKR) for schema validation.
- [ ] Draft contribution guide for prospective `@effect/money-*` driver authors.
- [ ] Evaluate alignment with existing accounting standards (OFX, ISO 20022, NACHA) for terminology consistency.
- [ ] Research regulatory guidance for billing and insurance obligations (FTC recurring billing rules, PSD2 SCA for subscriptions, NAIC standards) to inform schema fields.
