# @effect/money Specification: Requirements

## Scope

Define the foundational abstractions for a suite of financial-domain packages that parallels the structure of `@effect/platform`. The requirements cover:

1. **Core package (`@effect/money`)** providing canonical schemas, data models, and service interfaces for financial operations.
2. **Driver interface guidance** enabling implementation packages (`@effect/money-*`) to integrate with financial institutions, payment processors, accounting systems, and data warehouses.
3. **Cross-cutting concerns** such as identity, consent, compliance metadata, reconciliation, and auditing.

The specification must remain implementation-agnostic while being rich enough for downstream packages to map real-world APIs without ambiguity.

## Functional Requirements

### 1. Canonical Data Schemas
- Provide normalized schemas using `@effect/schema/Schema` for the following core domains:
  - **Institution** (financial institution metadata, capabilities, compliance constraints).
  - **Party** (person or organization, KYC/KYB attributes, risk profile).
  - **Account** (account identifiers, type classifications, currency, balances, ownership, access scopes).
  - **Instrument** (cards, loans, investment products, insurance policies, digital assets).
  - **Transaction** (ledger movements, status lifecycle, categorizations, reconciliation state, exchange rate context).
  - **Balance Snapshot** (available, current, credit limit, accrued interest, valuation timestamps).
  - **Statement** (periodic statements, line items, running balances, document metadata).
  - **Mandate / Authorization** (ACH authorization, SEPA mandate, card-on-file consent, trading power of attorney).
  - **Transfer Order** (one-off transfers, recurring schedules, approval workflows).
  - **Standing Instruction / Recurring Operation** (frequency, schedule, execution rules, retry policy).
  - **Obligation / Billing Arrangement** (open-ended recurring charges, term-limited payment plans, debt amortization schedules, coverage or utility usage meters, variable pricing formulas, settlement destinations).
  - **Exchange Rate Quote** (source, timestamp, base/quote currency, rate type, spreads).
- Schemas must capture status enums, references between entities, and auditing metadata (created/updated timestamps, versioning, provenance).
- Provide extensibility hooks (e.g., `extensions?: Schema.Record<string, Schema.Json>` or branded `Unknown` fields) to allow driver-specific metadata while keeping the base schema immutable.
- Recurring obligations must express recurrence cadence (calendar-anchored, usage-triggered, event-driven), pricing dimensions (fixed, tiered, index-linked, consumption-based), lifecycle (initiated, active, suspended, satisfied, defaulted), payoff math (amortized principal, interest accrual, balloon payments), and relationships to collateral or coverage assets (e.g., insurance cash value, prepaid balances).

### 2. Service Abstractions
- Define Effect services for the following capability areas, each with explicit error models:
  - **InstitutionDirectoryService** for discovery of supported institutions and capabilities.
  - **AccountAggregationService** for linking, refreshing, and revoking account connections.
  - **TransactionService** for paging, streaming, and reconciling transactions.
  - **TransferService** for initiating, tracking, and cancelling transfers.
  - **StandingInstructionService** for CRUD on recurring payments/transfers.
  - **ObligationService** for managing recurring billing arrangements, forecasting expected charges, updating payment schedules, and reconciling obligations against actual payments.
  - **BalanceService** for real-time balance snapshots and historical balance timelines.
  - **StatementService** for retrieving statements and documents.
  - **ComplianceService** for managing mandates, consents, and regulatory evidence.
  - **OnboardingService** for customer enrollment, KYC document collection, and account opening workflows.
  - **ExchangeRateService** for currency conversion quotes and settlement rates.
- Each service must specify capability detection (e.g., via `Effect` returning `Option<Capability>`), streaming vs. batch data retrieval, and idempotency expectations.
- Errors must use `Data.TaggedError` hierarchies with common discriminators (`type`, `reason`, `institutionId`, etc.).

### 3. Capability Modeling
- Introduce a capability description model that drivers use to declare supported features (e.g., `supportsRealTimeBalances`, `transferLimits`, `statementFormats`).
- Provide guidance on fallback behavior when capabilities are absent (e.g., degrade to batch sync, raise `CapabilityUnavailableError`).

### 4. Security & Compliance Metadata
- Require tracking of consent scopes, validity periods, and revocation metadata on all sensitive operations.
- Include audit trails for data fetches and state changes (who performed the action, with which credentials, and correlation IDs).
- Ensure schemas accommodate jurisdictional metadata (e.g., PSD2, NACHA, FINRA obligations).

### 5. Persistence & State Expectations
- Describe minimal persistence contracts that a driver or host application might need (token storage, cursor checkpoints, scheduling state).
- Define interfaces for pluggable storage abstractions (e.g., `CredentialStore`, `SyncStateStore`) without prescribing specific databases.

### 6. Testing & Validation Requirements
- Provide contract-test guidance that driver packages must satisfy (e.g., test harness for transaction sync, transfer execution, failure scenarios).
- Require example JSON payloads for each schema with validation rules and invariants to aid implementers.

## Non-Functional Requirements

- **Consistency**: Align naming, module layout, and service patterns with `@effect/platform` to minimize cognitive load.
- **Extensibility**: Support domain-specific extensions (treasury, wealth management, insurance) without breaking core contracts.
- **Scenario Diversity**: Explicitly model unconventional obligations (usage-indexed utilities, debt repayment plans, hybrid insurance-investment policies, tax withholdings, subscriptions with rollover benefits) so driver authors can represent industry-specific billing constructs without resorting to vendor-specific fields.
- **Internationalization**: Schemas must be currency-agnostic, support multiple locales, and allow varying identifier formats (IBAN, routing/account, SWIFT, IFSC, etc.).
- **Observability**: Define events/logging expectations for critical operations (sync start/finish, transfer status change, compliance events).
- **Performance**: Provide guidance on batching, pagination, streaming, and rate-limit handling to ensure scalable drivers.
- **Security**: Encourage encryption-at-rest for persisted secrets, token rotation, and principle of least privilege in capability modeling.

## Out of Scope

- Implementing concrete drivers or persistence adapters (handled in follow-up specs/tasks).
- Defining UI/UX components or rendering concerns.
- Building business-specific rules (e.g., budgeting categories) beyond generic schema slots.

## Acceptance Criteria

- Requirements document reviewed by core stakeholders with agreement on nouns, verbs, and constraints.
- Traceability matrix linking each service abstraction to one or more schemas and capability descriptions.
- Identified open questions or research tasks captured in the plan document.
