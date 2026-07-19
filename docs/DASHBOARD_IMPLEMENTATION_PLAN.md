# NoAgent4U Dashboard Implementation Plan

Plan date: 2026-07-19
Status: Phase 1 implemented and locally verified on 2026-07-19; Phases 2–9 remain gated.

## Outcome and delivery principles

The target is four deliberately separated experiences over one modular-monolith domain core:

1. Platform administration console.
2. Organization/property-management workspace.
3. Property-owner portal.
4. Tenant portal.

The current NestJS/Next.js/PostgreSQL architecture remains. No microservice conversion is recommended. Delivery must be incremental, additive, reversible where practical, and protected by API-level resource policies and automated negative authorization tests.

No requested operational feature should be called complete until UI, API, data model, authorization, validation/error handling, and relevant tests work together.

## Priority summary

### P0 — security and critical repair

- Separate platform principal from organization membership.
- Consolidate role/permission/resource policies; repair finance/manager access.
- Enforce property-owner/property-manager portfolio scope.
- Design verified tenant-to-lease-party identity linkage.
- Repair production Settings bootstrap/backfill.
- Add cross-organization, cross-owner, and cross-tenant negative tests.

### P1 — core operations

- Shared role-aware shell and design foundations.
- Administration/organization dashboard read models.
- Complete property/building/unit and lease-to-cash workflows.
- Invoice documents, payments, collections, scheduler.
- Space requests, owner portal, tenant portal.
- Email delivery, first payment gateway, and template foundation.

### P2 — workflow/usability expansion

- SMS/WhatsApp, maintenance, activity/reporting, advanced filters/exports.
- Accessibility, responsive, performance, and operational observability completion.

### P3 — optional/future

- Service-provider/vendor portal, advanced analytics, mobile feature parity, broader accounting integrations.

## Proposed information architecture

### Platform console

- Overview
- Organizations
- Approvals and Compliance
- Platform Administrators
- Service Health and Integration Failures
- Platform Audit

### Organization workspace

- Overview
- Portfolio: Properties; Buildings and Units
- People: Owners; Tenants; Staff and Access
- Leasing: Leases; Expiries and Renewals
- Finance: Invoices; Payments; Collections
- Requests: Maintenance; Space Requests
- Communications: Delivery Log; Templates
- Reports
- Settings: Organization, Billing Rules, Integrations, Roles, Audit

### Owner portal

- Overview
- Properties
- Financials and Statements
- Documents
- Maintenance and Tasks
- Profile/Preferences

### Tenant portal

- Home
- Lease and Documents
- Invoices and Payments
- Maintenance
- Space Request
- Notifications and Preferences

## Phase plan

## Phase 1 — security, principal boundaries, and critical repair

Implementation status: complete in code. Production migration/deployment remains an operator-controlled release step; see `docs/PHASE_1_IMPLEMENTATION_REPORT.md`.

Objective: establish a trustworthy authorization/data foundation before adding dashboards.

Deliverables:

1. Implement the `PlatformPrincipal` direction in `docs/ADRs/ADR-O1-001-platform-principal-boundary.md`; migrate current super-admin access safely and remove dependency on an organization membership for platform actions.
2. Define action/resource policies for organization, membership, property, building/unit, lease, invoice, payment, document, settings, and future portal reads.
3. Replace service-level system-role allowlists with a centralized policy service/guards. Seed a complete permission catalog.
4. Separate organization proprietor from managed property asset owner. Define portfolio assignments for owner, property manager, and finance staff.
5. Add a verified link from authenticated `Person/User` to lease-party identity; do not grant access by matching email/mobile strings.
6. Make organization settings initialization/backfill idempotent and repair the live `Organization settings not found` path.
7. Add HTTP/integration authorization fixtures for platform admin, organization admin, property manager, finance, owner, tenant, outsider, suspended member, and cross-organization cases.
8. Document migration/rollback/production verification and update stale architecture statements.

Acceptance gates:

- Every protected list/detail/mutation denies an authenticated cross-scope actor.
- Finance can perform approved finance actions but cannot change property/role configuration.
- A property manager sees only assigned scope unless granted organization-wide portfolio access.
- An owner sees only linked ownership/assignment scope.
- A tenant can resolve only linked lease/invoice/payment/document records.
- Platform operations no longer depend on tenant membership.
- Settings loads for every active organization; backfill is safe to rerun.
- No role-only frontend hiding is relied upon for security.

Estimated effort: XL (3–5 engineering weeks, depending on identity migration decisions).
Approval needed before start: role semantics, assignment rules, tenant invitation/link model.

## Phase 2 — design system, app frame, and route architecture

Objective: create a scalable light, responsive, accessible shell without broad domain rewrites.

Deliverables:

- Semantic light/dark tokens, warm neutral + emerald default, status mapping, typography/spacing/focus foundations.
- Separate route groups/frames for platform, organization, owner, and tenant experiences.
- Permission-aware sidebar/mobile drawer, breadcrumbs, organization switcher, user menu, notification placeholder.
- Shared page header, KPI, server table/filter, status badge, skeleton, empty/error, confirmation and detail-layout primitives.
- Fix all document-level mobile overflow and current dashboard/settings collapse.
- Route-level loading/error boundaries and request/correlation ID display for supportable failures.

Acceptance gates:

- No horizontal document overflow at 320px; 390px production scenarios pass visual regression.
- Keyboard/focus and WCAG 2.2 AA automated checks pass for shell/primitives.
- Navigation is derived from API-approved capabilities but API remains authoritative.
- Existing working routes remain usable during migration.

Estimated effort: L (2–3 weeks).
Dependencies: Phase 1 capability contract.

## Phase 3 — dashboard read models and administration workspaces

Objective: replace the four-count dashboard with useful, scoped, time-consistent operational views.

Deliverables:

- Organization dashboard aggregate endpoint/read service: portfolio/unit occupancy; lease states/30-60-90 expiry; period invoiced/collected/outstanding/overdue/collection%; invoice states; recent/unreconciled payments; request/job/delivery counts.
- Platform dashboard aggregate: organization lifecycle, approval/compliance queues, platform activity and service failures; no tenant financial data by default.
- Period, timezone, currency and as-of semantics; drill-down query links.
- Dashboard action queue, recent activity and quick actions.
- Efficient query plans/indexes measured with realistic fixtures.

Acceptance gates:

- Each KPI reconciles to its drill-down result under the same scope/time boundary.
- Empty/error/loading/partial-data states are explicit.
- Platform and organization dashboards never share principal scope accidentally.
- Performance budget is agreed and met on representative portfolio size.

Estimated effort: XL (3–4 weeks).
Dependencies: Phases 1–2; KPI definitions.

## Phase 4 — properties, buildings, and units

Objective: expose the existing backend hierarchy as a complete managed workflow.

Deliverables:

- Server-driven property list with owner, location, buildings/units, occupancy, active leases, expected rent, outstanding, status, filters/sort/page/actions.
- Property detail tabs for overview, buildings/units, leases/tenants, invoices/payments, documents, activity, requests.
- Building/floor/unit create/edit/archive/restore and bulk import with validation preview/error export.
- Occupancy integrity linked to lease rather than free-text tenant alone.
- Secure image/document upload and access foundation.

Acceptance gates:

- CRUD and bulk operations pass scope policies and optimistic-concurrency rules.
- Occupancy totals reconcile to unit records and active leases.
- Owner assignment cannot grant access outside authorized organization/portfolio.
- Mobile and keyboard flows pass.

Estimated effort: XL (4–6 weeks).
Dependencies: Phases 1–2; storage decision.

## Phase 5 — leases and automated billing

Objective: complete lease creation through billing schedule generation.

Deliverables:

- Canonical lease state machine and computed `expiring soon` indicator.
- Lease list/detail/create wizard, party/guarantor connection, terms/deposit, documents, activation/renewal/termination/archive.
- Billing calendar/rule UI, schedule preview/generation and exception handling.
- Real scheduler runtime with distributed locking, idempotency, run history, retry and alerting.
- Lease expiry/renewal work queue.

Acceptance gates:

- Invalid transitions and overlapping active occupancy are prevented transactionally.
- Schedule regeneration/retry cannot duplicate schedule rows/invoices.
- Tenant/owner visibility uses verified links and sharing rules.
- Timezone, proration, escalation and due-date examples are product-approved and tested.

Estimated effort: XL (4–6 weeks).
Dependencies: property/unit completion; lifecycle rules.

## Phase 6 — invoices, payments, and collections

Objective: deliver a usable lease-to-cash workflow on the existing finance foundation.

Deliverables:

- Invoice list/detail/generate/update/credit/archive with required filters and columns.
- Tax/GST, numbering, immutable render snapshot, PDF/download/send/remind after legal rules are approved.
- Payment record/detail/allocation/advance/refund UI; repair finance role.
- Aging read model: current, 1–30, 31–60, 61–90, 90+; tenant/property/owner breakdown.
- Collection activity/reminder status/last contact/promise-to-pay notes/export.
- Automatic overdue transition and reminder intent jobs.

Acceptance gates:

- Invoice totals, credits, allocations and balances reconcile exactly.
- Over-allocation, duplicate generation and cross-scope allocations are rejected.
- Aging uses a defined business date/timezone and reconciles to invoice balances.
- PDFs/exports enforce the same scope as list/detail APIs.

Estimated effort: XL (5–7 weeks).
Dependencies: Phase 5; tax/document decisions.

## Phase 7 — space requests and maintenance

Objective: add tenant/prospect demand and service-request workflows without conflating them.

Deliverables:

- `SpaceRequest` aggregate with request number, prospect/tenant/current unit, location/type/area/budget/move-in/duration/furnishing/parking/notes/assignment/matches/follow-up/priority/status/activity.
- Availability/matching service using authorized available units.
- Staff list/detail/kanban-style status workflow and tenant/prospect submission/tracking.
- Separate maintenance aggregate for issue/category/priority/access preference/images/assignment/vendor/status/activity/cost visibility.

Acceptance gates:

- Tenant sees only own requests; owner sees requests/maintenance only for authorized properties.
- Status transitions and assignment/audit are explicit.
- Matching does not disclose private unit/tenant/owner information.

Estimated effort: XL (4–6 weeks).
Dependencies: tenant identity; property availability; uploads.

## Phase 8 — owner and tenant portals

Objective: provide dedicated self-service experiences on proven scoped APIs.

Deliverables:

- Owner: assigned portfolio, occupancy/performance, financials/statements, invoices/payments, documents, maintenance/tasks.
- Tenant: current tenancy, dates/days remaining, rent/next due/deposit, invoice states, payment/receipt history, agreement/documents, maintenance, space request, notifications/preferences.
- Invitation/activation/revocation and support recovery flows.
- Permission-aware quick actions and safe shared-document controls.

Acceptance gates:

- Dedicated role journeys pass API and Playwright cross-scope negative tests.
- Revoked ownership/lease access is removed predictably while required historical records remain preserved.
- No management-only metadata or another party's records appear in portal APIs/exports.

Estimated effort: XL (4–6 weeks).
Dependencies: Phases 1, 4–7.

## Phase 9 — integrations, gateways, and templates

Objective: complete outbound communication and online payment safely.

Deliverables:

- Encrypted integration connection model/settings with audit, redaction, connection test and enable control.
- Versioned draft/publish template system with merge schema/preview/render snapshot/PDF support.
- Real email adapter and delivery logs first; then SMS and WhatsApp template mapping/webhooks.
- First payment gateway adapter, test/live config, signed raw-body webhooks, event idempotency, payment/allocation linkage, refunds and reconciliation queue.
- In-app notifications and communication preferences.

Acceptance gates:

- Secrets never return in API responses/logs and rotate safely.
- Duplicate/out-of-order webhook tests cannot duplicate a payment or allocation.
- Published template versions are immutable and historical renders reproducible.
- Delivery/reconciliation failures are visible and actionable.

Estimated effort: XL (6–10 weeks across provider increments).
Dependencies: provider/country/legal decisions; finance/templates foundation.

## Phase 10 — reporting, hardening, and release readiness

Objective: close quality, performance, accessibility, operations and documentation gaps.

Deliverables:

- Scoped portfolio, rent roll, lease expiry, receivables, payment/reconciliation and owner statements.
- CSV/XLSX/PDF export jobs with access-controlled artifacts and audit.
- Accessibility/manual assistive-technology audit and responsive regression.
- Load/query tuning, worker concurrency/chaos/replay tests, backup/restore and migration rehearsal.
- Security review, dependency/container scan, log/metric/alert dashboards and incident runbooks.
- Documentation reconciled to actual runtime.

Acceptance gates:

- Full role regression and critical performance/error budgets pass.
- Production migration is rehearsed on a sanitized, representative copy.
- Rollback/forward-fix and reconciliation procedures are documented.
- Product owner signs off KPI, financial, portal and document outputs.

Estimated effort: L/XL (3–6 weeks plus ongoing hardening).
Dependencies: all prior operational phases.

## Data and API changes

Names below are proposals, not approved schema contracts.

| Need                   | Proposed data change                                                                               | Proposed API/read contract                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Platform admin         | `PlatformPrincipal`/role/session linkage independent of organization membership                    | `/v1/platform/...` or existing admin routes with platform guard        |
| Asset owner identity   | Link `PropertyOwnership` to a verified person/user or owner account; explicit portfolio assignment | `/v1/owner-portal/...`; organization owner-management APIs             |
| Staff scope            | `PortfolioAssignment(subject, property, role/capability, validFrom/To)`                            | Policy-resolved property filter; no client-supplied unrestricted scope |
| Tenant identity        | Lease party link to `Person/User`, invitation status and validity                                  | `/v1/tenant-portal/leases                                              | invoices | payments | documents` derived from principal |
| Dashboards             | Read services/materialized projections only if measurements require                                | Scoped aggregate endpoints with period/as-of/currency                  |
| Space requests         | `SpaceRequest`, requirement fields, assignment, match, activity                                    | Organization CRUD/work queue and tenant/prospect self-service          |
| Maintenance            | Request, assignment, status/activity/attachment                                                    | Scoped management/owner/tenant routes                                  |
| Collections            | Collection activity, promise, reminder/result; aging may be computed/read-model                    | Aging summary/detail, reminders, notes and exports                     |
| Integrations/templates | As detailed in `INTEGRATION_AND_TEMPLATE_AUDIT.md`                                                 | Settings, test, delivery log, template draft/publish/preview           |
| Gateway                | Connection, intent, transaction, webhook event, settlement, refund                                 | Checkout, signed webhook, reconciliation/refund APIs                   |
| Documents              | File metadata, ownership/classification, scan state, immutable render linkage                      | Upload-intent, complete, signed-download and audit APIs                |

## Migration strategy

1. Add new principal/link/assignment columns and tables as nullable/additive.
2. Backfill deterministic organization settings and current super-admin mapping idempotently.
3. Create explicit review queues for ambiguous owners/lease parties rather than guessing identity matches.
4. Run dual-read or shadow policy comparisons where safe; log mismatches without granting access.
5. Enforce constraints only after backfill/report review.
6. Switch endpoints to centralized policies behind deployable flags where appropriate.
7. Remove deprecated role-code paths in a later migration/release.
8. Keep expand/backfill/contract steps separate; never combine destructive cleanup with first deployment.

Required production evidence per migration: row counts before/after, unmatched/ambiguous count, constraint/index status, runtime compatibility, forward-fix/rollback path, and no secrets/PII in logs.

## Test strategy

### Authorization matrix

Create deterministic fixtures for platform admin, org owner/admin/manager/finance, scoped owner, tenant, suspended member, outsider and second organization. For every list/detail/mutation/export/document route, test allowed and denied cases including guessed IDs.

### Domain tests

- Property hierarchy, archive/restore and occupancy/lease consistency.
- Lease transitions, overlap, proration, escalation, renewal and termination.
- Idempotent schedule/invoice/reminder job execution.
- Invoice/credit/payment/allocation/refund/aging invariants with exact money.
- Space request/maintenance transitions and assignment.
- Template render and provider/gateway contracts.

### API/database integration

Run against PostgreSQL in CI without optional silent skips for critical suites. Cover transaction concurrency, unique constraints, pagination/filter/sort consistency, cross-organization queries and migration compatibility.

### Browser end to end

Use Playwright for each role's critical journey at desktop and 390px mobile: login/session refresh, navigation, create/edit/archive, filters/page, lease-to-invoice-to-payment, portal downloads, permission failures, Settings, connection/template/gateway test flows. Seed data through supported test APIs/fixtures, not UI shortcuts that bypass policy.

### Non-functional

- axe plus manual keyboard/screen-reader review.
- Visual regression at 390, 768, 1280 and 1440 widths.
- Query/load budgets on representative portfolio sizes.
- Worker duplicate/retry/DLQ/replay and scheduler lock tests.
- Secret/log redaction, webhook abuse, upload/content and export authorization tests.

## Risks and mitigations

| Risk                                                 | Impact                              | Mitigation                                                                                          |
| ---------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| Ambiguous meaning of `OWNER`                         | Wrong data exposure/model migration | Product decision and explicit organization-proprietor vs asset-owner concepts before code.          |
| Existing records lack verified owner/tenant identity | Unsafe automated linking            | Review queue; invitation/verification; never match solely by mutable email/mobile.                  |
| Broad role-code behavior is relied on operationally  | Security fix disrupts users         | Inventory actual memberships, shadow-evaluate new policies, staged rollout and support plan.        |
| Historical docs overstate runtime                    | Planning/deployment errors          | Update docs with code-derived current-state markers in each phase.                                  |
| Financial/tax rules undefined                        | Incorrect invoices/statements       | Obtain jurisdiction/currency/tax/accounting decisions before schema/rendering.                      |
| Provider lock-in/secrets                             | Cost and security exposure          | Adapter boundaries, encrypted config, test/live separation, audited rotation.                       |
| Dashboard queries become expensive                   | Slow UI/database pressure           | Dedicated aggregates, indexed scoped queries, measurement before materialization.                   |
| Scope expands into full ERP                          | Delayed usable product              | Keep lease-to-cash/portfolio scope explicit; defer general ledger/trust accounting unless approved. |

## Approval decisions before Phase 1

1. Platform admin is a separate principal from organization roles: recommended **yes**.
2. Split organization proprietor and property asset owner: recommended **yes**.
3. Property managers/finance receive explicit portfolio assignment with optional organization-wide grant: recommended **yes**.
4. Tenant access requires an invitation-linked verified user/person/lease-party relation: recommended **yes**.
5. Approve a production-safe settings default/backfill policy.
6. Provide representative non-production role fixtures or approve their creation in test only.

After these decisions, implementation may begin only when the product owner replies exactly:

`APPROVE IMPLEMENTATION – PHASE 1`
