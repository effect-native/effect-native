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
  - **Asset** (fungible currencies, commodities, loyalty points, reward balances, and non-fungible collectibles with provenance,
    grading, or minting metadata for scenarios like rare sneakers, Pokémon cards, NFTs, or in-game artifacts).
  - **Transaction** (ledger movements, status lifecycle, categorizations, reconciliation state, exchange rate context).
  - **Balance Snapshot** (available, current, credit limit, accrued interest, valuation timestamps).
  - **Statement** (periodic statements, line items, running balances, document metadata).
  - **Mandate / Authorization** (ACH authorization, SEPA mandate, card-on-file consent, trading power of attorney).
  - **Transfer Order** (one-off transfers, recurring schedules, approval workflows).
  - **Standing Instruction / Recurring Operation** (frequency, schedule, execution rules, retry policy).
  - **Obligation / Billing Arrangement** (open-ended recurring charges, term-limited payment plans, debt amortization schedules, coverage or utility usage meters, variable pricing formulas, settlement destinations).
  - **Product / Service Offering** (catalog entries for goods, services, subscriptions, bundles, deposits, add-ons, and virtual items with pricing tiers, packaging, regulatory constraints, fulfillment channels, and revenue recognition hints).
  - **Inventory Position** (stock levels, reservable quantities, serial numbers, condition grading, edition/lot tracking for physical or digital goods, and custody or warehouse location references for remote fulfillment).
  - **Order / Invoice** (line items referencing offerings, obligations, or assets, applied discounts/fees/taxes, fulfillment status, shipping/hand-off plans, and settlement references to payments or transfers).
  - **Shopping Session Artifact** (quotes, carts, wish lists, configured bundles, saved tender preferences, and partially executed checkouts that can be converted into orders, obligations, or standing instructions).
  - **Exchange Rate Quote** (source, timestamp, base/quote currency, rate type, spreads).
- Schemas must capture status enums, references between entities, and auditing metadata (created/updated timestamps, versioning, provenance).
- Provide extensibility hooks (e.g., `extensions?: Schema.Record<string, Schema.Json>` or branded `Unknown` fields) to allow driver-specific metadata while keeping the base schema immutable.
- Recurring obligations must express recurrence cadence (calendar-anchored, usage-triggered, event-driven), pricing dimensions (fixed, tiered, index-linked, consumption-based), lifecycle (initiated, active, suspended, satisfied, defaulted), payoff math (amortized principal, interest accrual, balloon payments), and relationships to collateral or coverage assets (e.g., insurance cash value, prepaid balances).
- Commerce artifacts must express fungibility, divisibility, and uniqueness constraints; attach valuation sources and provenance (issuer, grading/certification body, minting/edition identifiers, serial numbers); and allow linking to custody accounts or escrow arrangements so game economies, collectible marketplaces, and cash-based merchants can share the same primitives.

### 2. Service Abstractions

- Define Effect services for the following capability areas, each with explicit error models:
  - **InstitutionDirectoryService** for discovery of supported institutions and capabilities.
  - **AccountAggregationService** for linking, refreshing, and revoking account connections.
  - **TransactionService** for paging, streaming, and reconciling transactions.
  - **TransferService** for initiating, tracking, and cancelling transfers.
  - **StandingInstructionService** for CRUD on recurring payments/transfers.
  - **ObligationService** for managing recurring billing arrangements, forecasting expected charges, updating payment schedules, and reconciling obligations against actual payments.
  - **CatalogService** for browsing offerings, pricing variants, bundles, and availability windows.
  - **OrderLifecycleService** for managing carts, quotes, checkout orchestration, order capture, fulfillment updates, returns, and linkage to payment or transfer intents.
  - **AssetRegistryService** for resolving fungible/non-fungible asset metadata, entitlements, vesting, mint/burn events, depreciation schedules, and custody relationships.
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
- Extend the taxonomy with commerce and experience facets (catalog depth, inventory reservations, customization rules, cart persistence, offer personalization, entitlement issuance, loyalty accrual, secondary-market resale permissions) so applications can negotiate features across consumer retail, professional services, gaming marketplaces, DeFi, and collectibles trading.

### 4. Security & Compliance Metadata

- Require tracking of consent scopes, validity periods, and revocation metadata on all sensitive operations.
- Include audit trails for data fetches and state changes (who performed the action, with which credentials, and correlation IDs).
- Ensure schemas accommodate jurisdictional metadata (e.g., PSD2, NACHA, FINRA obligations).

### 5. Persistence & State Expectations

- Describe minimal persistence contracts that a driver or host application might need (token storage, cursor checkpoints, scheduling state).
- Define interfaces for pluggable storage abstractions (e.g., `CredentialStore`, `SyncStateStore`) without prescribing specific databases.

### 6. Testing & Validation Requirements

- Provide contract-test guidance that driver packages must satisfy (e.g., test harness for transaction sync, transfer execution, failure scenarios).
- Define scenario-driven validation suites covering local retail POS, cash-only settlements, crypto smart-contract obligations, online retail carts, marketplace consignments, SaaS subscriptions, personal finance aggregation, bank core ledgers, simulation games, RPG economies, and collectible exchanges to prevent over/under abstraction.
- Require example JSON payloads for each schema with validation rules and invariants to aid implementers.

## Non-Functional Requirements

- **Consistency**: Align naming, module layout, and service patterns with `@effect/platform` to minimize cognitive load.
- **Extensibility**: Support domain-specific extensions (treasury, wealth management, insurance) without breaking core contracts.
- **Scenario Diversity**: Explicitly model unconventional obligations (usage-indexed utilities, debt repayment plans, hybrid insurance-investment policies, tax withholdings, subscriptions with rollover benefits) so driver authors can represent industry-specific billing constructs without resorting to vendor-specific fields. Extend the same rigor to commerce concepts (perishable inventory, digital entitlements, configurable bundles, tipping, marketplace commissions, secondary-market resales) so the core schema remains a superset of consumer retail, professional services, gaming, and DeFi ecosystems.
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
- Documented scenario mapping showing how representative use cases (local coffee shop, cash-only handyman, crypto dApp, online merch store, sneaker flipping marketplace, lean SaaS, personal finance aggregator, bank core, Monopoly-style simulation, RPG marketplace, collectible trading) compose the canonical schemas and services without extra bespoke contracts.
