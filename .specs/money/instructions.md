# @effect/money Specification: Instructions

## Vision

Design a modular suite of Effect packages that provides a universal, implementation-agnostic abstraction for working with consumer and enterprise financial data. Mirroring the patterns established by `@effect/platform`, the initiative must define the core domain interfaces, schemas, and behaviors while enabling ecosystem packages to supply concrete integrations for banks, brokerages, payment networks, accounting systems, and data providers.

## Stakeholders

- **Application engineers** building Effect applications that need reliable financial data access and actions (e.g., budgeting tools, accounting systems, treasury automation).
- **Integration authors** who contribute `@effect/money-*` drivers for specific financial institutions, data providers, or persistence layers.
- **Compliance and risk teams** that require auditable, strongly typed representations of financial operations.

## Problem Statement

The Effect ecosystem currently lacks a standardized domain model for financial resources and actions. Developers repeatedly re-invent schemas for accounts, instruments, transactions, transfers, and scheduled operations, making it difficult to compose integrations or swap providers. We need shared specifications that:

1. **Normalize terminology** across retail banking, payments, brokerage, credit, and accounting domains.
2. **Provide canonical schemas** covering the primary nouns (accounts, institutions, instruments, customers, mandates, transactions, balances, statements, standing orders, etc.).
3. **Define core service abstractions** for common verbs (syncing accounts, executing transfers, reconciling balances, managing recurring operations, onboarding customers, etc.).
4. **Support extensibility** so driver packages can specialize behavior without diverging from the core contract.

## Deliverables for Specification Phase

- A requirements breakdown capturing supported domains, data coverage, and service responsibilities.
- A design document describing module layout, Effect services, schema definitions, and extension mechanisms.
- A delivery plan enumerating milestones for introducing the packages and expanding coverage.

Completion of the specification phase means stakeholders agree on the schemas, interfaces, and roadmap so implementation work can begin in separate follow-up specs or tasks.
