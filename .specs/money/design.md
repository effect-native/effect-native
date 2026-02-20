# @effect/money Specification: Design

## Package Topology

Following the precedent set by `@effect/platform`, the financial packages will be structured as:

- **`@effect/money`** – Core domain schemas, capability descriptors, error types, and abstract services. Purely declarative and dependency-free aside from Effect, Schema, and Data.
- **`@effect/money-client`** – Shared client utilities (retry/backoff, pagination helpers, contract-test harness) for applications and driver authors.
- **`@effect/money-storage`** – Optional abstractions for persistence (credential stores, sync checkpoints, audit event sinks) expressed as Effect services without concrete storage dependencies.
- **`@effect/money-*` driver packages** – Institution, network, or infrastructure-specific implementations (e.g., `@effect/money-plaid`, `@effect/money-treasury-prime`, `@effect/money-ledger-firestore`). Each driver provides Layers satisfying the core services and declares capabilities.

The spec focuses on the first three packages; drivers will be defined in follow-up specs that reference this contract.

## Module Layout (Core Package)

```
packages/money/
  src/
    Schema/
      Institution.ts
      Party.ts
      Account.ts
      Instrument.ts
      Asset.ts
      Transaction.ts
      Balance.ts
      Statement.ts
      Mandate.ts
      Transfer.ts
      StandingInstruction.ts
      Obligation.ts
      Offering.ts
      Inventory.ts
      Order.ts
      Cart.ts
      Wishlist.ts
      ExchangeRate.ts
      Common.ts (identifiers, enums, money amounts)
    Capability/
      descriptors.ts (structured capability taxonomy)
      matrix.ts (lookup utilities)
    Errors/
      index.ts (Data.TaggedError hierarchies)
    Services/
      InstitutionDirectory.ts
      AccountAggregation.ts
      Transactions.ts
      Transfers.ts
      StandingInstructions.ts
      Obligations.ts
      Catalog.ts
      Inventory.ts
      Orders.ts
      Assets.ts
      Balances.ts
      Statements.ts
      Compliance.ts
      Onboarding.ts
      ExchangeRates.ts
    Auditing/
      Events.ts (event payload schemas)
      Correlation.ts (ID utilities)
    index.ts (public exports)
    internal/ (shared helpers not exported publicly)
```

### Schema Design Principles

1. **Composable Building Blocks**: Define primitives in `Schema/Common.ts` such as `MoneyAmount`, `CurrencyCode`, `AccountId`, `InstitutionId`, `Timestamp`, `Percentage`, and `LocalizedString`. All other schemas reference these primitives to ensure consistency.
2. **Branded Identifiers**: Use `Schema.Brand` to create strongly typed IDs (e.g., `type AccountId = Schema.Brand<Schema.UUID, "AccountId">`).
3. **Status Machines**: Model lifecycle states using literal unions (e.g., `TransactionStatus = "pending" | "posted" | "reversed" | ...`). Include transitions in documentation to guide driver behavior.
4. **Audit Fields**: Every entity includes `source`, `capturedAt`, `receivedAt`, `lastUpdatedAt`, and optional `provenance` objects describing the integration, API version, and credential reference.
5. **Extension Slots**: Provide `extensions?: Schema.ReadonlyArray<ExtensionEnvelope>` where `ExtensionEnvelope` captures `{ namespace: Schema.NonEmptyString, data: Schema.JsonRecord }`, allowing institution-specific metadata without polluting the core schema.
6. **Relationship References**: Use typed IDs and optional embedded summaries (e.g., `accountSummary?: AccountSummary`) to support efficient consumption without requiring secondary fetches.
7. **Obligation Modeling**: Represent recurring obligations with normalized components (`ObligationTerm`, `ObligationCharge`, `UsageMeterReading`, `CoverageAsset`). Support fixed and floating schedules, evergreen commitments with renegotiation windows, debt amortization ladders, escrow-backed disbursements, and hybrid insurance-investment instruments by decomposing the obligation into commitments, pricing sources, and settlement instructions.
8. **Asset & Commerce Modeling**: Model fungible and non-fungible assets with `AssetIdentity`, `AssetClassification`, and `AssetValuation` records, plus custody links to accounts or off-ledger storage. Offerings compose assets, services, fees, and incentives into sellable bundles, while `InventoryItem`, `OrderLine`, `CartEntry`, and `WishlistEntry` schemas share primitives for availability, personalization, entitlements, and lifecycle (reserved, fulfilled, cancelled, returned). This keeps coffee shop POS items, crypto tokens, SaaS plans, RPG loot, and collectible trades aligned on the same building blocks.

### Service Contracts

Each service module exports:

- **Service Tag** (`const InstitutionDirectoryService = Context.Tag<...>()`).
- **Interface** describing operations with typed inputs/outputs (using `Effect` and `Stream`).
- **Layer constructors** for composition (e.g., `InstitutionDirectory.layer`, `InstitutionDirectory.withClient`).
- **Capability negotiation** functions enabling runtime checks (e.g., `hasCapability("transactions.streaming")`).
- **Scenario primitives** for obligations (e.g., pricing snapshots, forecast generation) that allow applications to reconcile indefinite rent, consumption-indexed utilities, or insurance cash value adjustments with the same API surface.
- **Commerce orchestrators** that let catalogs, carts, and orders compose with transfers or obligations—for example, a coffee shop POS capturing an order and settling via cash drawer reconciliation, a crypto dApp minting NFTs while triggering asset registry entries, or a game marketplace reserving digital loot and debiting an in-world wallet.

Example (pseudocode):

```ts
export interface InstitutionDirectoryService {
  readonly list: Effect<ReadonlyArray<Institution>>
  readonly get: (id: InstitutionId) => Effect<Option<Institution>>
  readonly capabilities: (id: InstitutionId) => Effect<CapabilityMatrix>
}
```

Error types (e.g., `InstitutionError`, `TransactionError`) extend `Data.TaggedError` with discriminants (`_tag`, `reason`, `institutionId`, `retryable`). Services document which errors may surface and under what conditions.

### Capability Taxonomy

The `Capability/descriptors.ts` module defines a hierarchical taxonomy:

- **Domain** (`accounts`, `transactions`, `transfers`, `statements`, `fx`, `compliance`, `obligations`, `catalog`, `orders`, `assets`).
- **Features** (`realTime`, `historical`, `streaming`, `batch`, `sameDay`, `wire`, `ach`, `sepa`, etc.).
- **Constraints** (limits, cutoff windows, supported currencies, jurisdictions).
- Obligation features call out billing archetypes (`evergreen`, `term`, `balloon`, `metered`, `tieredPricing`, `indexLinked`, `coverageLinked`), tolerance policies (grace periods, dunning strategies), and settlement mechanisms (auto-debit, manual pay, escrow drawdown).
- Commerce features express catalog richness (bundles, configurable options, localized menus), inventory behavior (real-time reservations, batch restock windows, serialized goods), order flows (draft quotes, partial fulfillment, returns/exchanges, layaway), asset lifecycles (mint/burn, appreciation curves, depreciation schedules), and marketplace mechanics (commissions, escrow, royalties).

Capabilities are modeled as schemas allowing drivers to advertise support, optionally including quantitative limits. Applications query capabilities before invoking services, enabling graceful degradation.

### Auditing & Observability

- **Event schemas** describe standard events (`SyncStarted`, `SyncCompleted`, `TransferInitiated`, `TransferSettled`, `TransferFailed`, `MandateCreated`, `ConsentRevoked`).
- Obligation events capture lifecycle transitions (`ObligationActivated`, `ObligationChargeForecasted`, `ObligationChargePosted`, `ObligationSatisfied`, `ObligationDelinquent`) along with pricing provenance (e.g., rate tables, meter readings, underwriting adjustments).
- Services emit events via an optional `AuditEventSink` service defined in `@effect/money-storage`. Drivers depend on the sink but do not assume a specific implementation.

## Scenario Coverage Matrix

To confirm the abstractions remain composable without overfitting, the design maps representative scenarios to schemas/services:

- **Local coffee shop** – Uses `Offering`, `InventoryItem`, `Order`, and `CatalogService` for menu items, links tender to `TransferService` (card) or `Order` cash settlement adjustments, and records loyalty stamps as `Asset` balances.
- **Cash-only local handyman** – Captures `Order` estimates and invoices, settles via `TransferOrder` flagged as `cash`, and tracks tool depreciation or gift card liabilities via `AssetRegistryService`.
- **Crypto dApp** – Mints NFTs or governance tokens via `Asset` lifecycles, orchestrates smart-contract interactions through `TransferService` plus `ObligationService` (staking rewards) and `Order` flows for marketplace listings.
- **Online merch store** – Manages `CatalogService`, `InventoryService`, `OrderLifecycleService`, and `StandingInstructionService` for subscriptions or pre-orders, with `Obligation` ties for payment plans.
- **eBay sneaker flipping business** – Models consignments as `Order` with marketplace commissions, associates serialized sneakers as `Asset` with provenance, and records payouts via `TransferService`.
- **SaaS with zero employees** – Represents plans as `Offering` plus `Obligation` for recurring billing, automates onboarding via `OnboardingService`, and tracks entitlements through `AssetRegistryService`.
- **Personal finance app** – Aggregates institutions/accounts via `AccountAggregationService`, normalizes transactions, and surfaces obligations (bills, subscriptions) and carts/wish lists imported from commerce platforms.
- **Bank app** – Uses full suite: `InstitutionDirectory`, `Account`, `Transaction`, `Transfer`, `Obligation`, `Catalog` for product cross-sell, and `Asset` for loyalty points or safe deposit inventory.
- **Monopoly video game** – Treats in-game properties and chance cards as `Asset` entries, uses `Order` for trades, `TransferService` for bank payouts, and `ObligationService` for rent or mortgages.
- **RPG in-world marketplace** – Employs `CatalogService` for NPC vendors, `OrderLifecycleService` for player trades, `AssetRegistryService` for unique loot, and `InventoryService` for respawn timers or crafting inputs.
- **Pokémon card trading** – Records each card as non-fungible `Asset` with grading metadata, uses `Order` + `Transfer` for trades, and `Obligation` for consignment or layaway deals.

### Storage Abstractions

`@effect/money-storage` defines interfaces for:

- `CredentialStore` – persist encrypted institution credentials and OAuth tokens.
- `SyncStateStore` – track cursors, last success timestamps, incremental sync state.
- `TransferStore` – persist transfer instructions and state transitions for idempotency.
- `AuditEventSink` – append-only store for audit events (e.g., Kafka, Postgres, file-based).
- `CatalogStore` – optional cache for offerings, inventory availability, and personalized pricing rules.
- `OrderStore` – persist carts, quotes, orders, and fulfillment checkpoints for omnichannel experiences (in-person + digital).
- `AssetLedger` – track non-fungible registry metadata, custody changes, and entitlements when assets are off-core (vaulted, on-chain, or in-game).

Each interface relies solely on `Effect` primitives and is optionally provided by applications or driver bundles.

### Contract Testing Toolkit

`@effect/money-client` provides:

- Schema validation helpers to assert driver outputs conform to core schemas.
- Standardized mock servers for verifying webhook handling and OAuth flows.
- Harness utilities for running cross-driver test suites (e.g., verifying transactions streaming). This mirrors `@effect/platform/test` patterns.
- Scenario packs that simulate commerce workflows (POS order, cash settlement, NFT mint + sale, recurring SaaS charge, game loot trade) so implementers can validate catalog/order/asset behaviors end-to-end alongside traditional finance flows.

## Extension Strategy

- Drivers extend via the `extensions` field and may expose additional services in their own namespace (e.g., brokerage-specific order management). Core package remains stable.
- Provide recommended naming for driver packages (`@effect/money-{institution|provider}`) and persistence packages (`@effect/money-storage-{backend}`).
- Encourage cross-domain bridges (e.g., linking `@effect/platform` HTTP clients for driver communication).
- Invite ecosystem modules for verticalized commerce (`@effect/money-commerce-pos`, `@effect/money-commerce-marketplace`, `@effect/money-gaming`) that plug into the same catalog/order/asset contracts while introducing additional scenario packs or capability descriptors.

## Open Questions

- Should we include real-time payment network orchestration (RTP, FedNow) in the initial capability taxonomy or treat it as a follow-up?
- How to model complex multi-leg transactions (e.g., securities settlement) without overwhelming the base schema?
- What minimal metadata is required for regulatory reporting (e.g., SAR/CTR thresholds) to keep the core ergonomic?

These questions will be tracked in the plan document.
