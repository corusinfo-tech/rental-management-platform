# NoAgent4U Reference Research

Research date: 2026-07-19
Method: current public product pages/help centers and primary GitHub repository/release/license pages. References are used for patterns and gap analysis only; no code or design was copied.

## Executive summary

The strongest common pattern is separation of experiences and data scopes: property managers operate a broad workspace, owners see assigned properties and selected financial reports, and tenants see only connected lease/payment/document/request data. Buildium, AppFolio, DoorLoop, and TenantCloud all demonstrate task-focused portals rather than one identical navigation for every role.

For NoAgent4U, Buildium is the clearest reference for resident/owner portal capability, TenantCloud is especially useful for explicit assignment and sharing boundaries, DoorLoop is useful for an owner dashboard that does not grant staff access, and AppFolio provides a concise multi-portal model including vendors. These are product-pattern references, not implementation dependencies.

Among open-source projects, MicroRealEstate is the closest domain comparison and MIT-licensed, but its latest visible release is from 2024 and its architecture should not replace the current NestJS/Next.js modular monolith. ERPNext is very actively maintained and useful for accounting/workflow/audit concepts, but its GPL-3.0 code must not be incorporated without explicit licensing review. Odoo illustrates modular business applications and mature workflow patterns, but license and edition boundaries require careful legal review. No open-source code reuse is recommended in the first implementation phases.

## Commercial/product references

| Reference                                                                                                            | Current public evidence                                                                                                                                                                | Useful patterns for NoAgent4U                                                                                                              | Limits/cautions                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [Buildium Resident Center](https://www.buildium.com/features/resident-center/)                                       | Residents can pay, see payment history, submit/track maintenance, receive email/text updates, and access documents on desktop/mobile.                                                  | Tenant home organized around Pay, next due, maintenance, messages, and documents; mobile self-service; explicit role/status access.        | Marketing material does not expose its internal data/security architecture. Use the information hierarchy, not visual imitation. |
| [Buildium Owner Portal](https://www.buildium.com/features/property-owner-portal/)                                    | Owners receive property financial reports, contributions/draws/transactions, documents, communications, and maintenance history.                                                       | Property-scoped owner portfolio, statements, documents, tasks/approvals; owner access separate from staff permissions.                     | Financial/accounting depth exceeds the current NoAgent4U ledger; define local accounting scope before copying terminology.       |
| [Buildium online payments](https://www.buildium.com/features/online-rent-payments/)                                  | Online payment, autopay/reminders, transaction visibility, and integrated property accounting are presented as one flow.                                                               | Connect tenant Pay action, provider event, internal payment/allocation, receipt, and operator reconciliation rather than isolated screens. | Provider/regulatory behavior varies by market.                                                                                   |
| [AppFolio portal entry points](https://www.appfolio.com/login)                                                       | Separate resident, owner, vendor, and investment/investor portal entry points are publicly listed.                                                                                     | Strong evidence for role-specific portal boundaries and future vendor/maintenance access rather than one universal shell.                  | Login page is only a high-level capability reference.                                                                            |
| [AppFolio Resident Portal overview](https://www.appfolio.com/help/online-portal)                                     | Residents can pay charges, view payment history, submit maintenance requests, review documents, and activate through email/text.                                                       | Invitation-based tenant-to-lease connection; simple tenant navigation; payment/document/request grouping.                                  | Do not infer authorization implementation from help content.                                                                     |
| [DoorLoop Owner Portal](https://support.doorloop.com/en/articles/8392701-introduction-to-the-owner-portal)           | Owner portal offers assigned-property financials, reports, maintenance and documents; the help page explicitly says owners are not normal users and cannot see other owners/bank data. | Directly supports a separate owner principal/portal, property assignment, least-privilege views, and owner-tailored reporting.             | Product packaging and terminology are vendor-specific.                                                                           |
| [DoorLoop product overview](https://www.doorloop.com/)                                                               | Current overview groups accounting/reconciliation, online rent, tenant portal, maintenance, and owner reporting.                                                                       | Navigation/domain grouping and need for bank reconciliation/owner statements as deliberate later scope.                                    | Marketing claims require workflow-level validation before using as acceptance criteria.                                          |
| [TenantCloud account portals guide](https://support.tenantcloud.com/en/articles/12781485-account-portals-guide)      | Distinct landlord/property-manager, tenant, owner, and service-professional portals; tenant includes autopay/payment history.                                                          | Role-specific information architecture and future maintenance-provider boundary.                                                           | NoAgent4U should not add a vendor portal before core management/tenant scope is secure.                                          |
| [TenantCloud owner visibility](https://support.tenantcloud.com/en/articles/11896989-what-does-my-owner-see)          | Owners see assigned properties, open/overdue invoices, agreements, reports, requests, files, messages, and money movements.                                                            | Assignment is the controlling access concept; useful owner dashboard sections and report sharing controls.                                 | Owner contributions/distributions imply trust accounting not yet modeled locally.                                                |
| [TenantCloud tenant visibility](https://support.tenantcloud.com/en/articles/11897503-what-does-my-tenant-see)        | A tenant is invited/connected to a lease and sees shared lease information, attachments, transactions, and linked maintenance.                                                         | Excellent reference for explicit verified tenant connection and per-document/request sharing; avoids unsafe email matching.                | Sharing rules must be simplified and tested carefully to avoid accidental withholding or disclosure.                             |
| [TenantCloud owner reports](https://support.tenantcloud.com/en/articles/12817516-what-reports-can-i-use-as-an-owner) | Reports are limited to assigned properties and manager-enabled visibility; PDF/Excel downloads are supported.                                                                          | Report authorization should reuse property assignment and explicit report visibility; exports must match on-screen scope.                  | Export security and data volume need independent implementation controls.                                                        |

## Product patterns to adopt

### 1. Separate portals, shared domain core

Use separate route groups/application frames for platform administration, organization operations, owners, and tenants. They can share components and APIs, but every API must enforce its resource scope. This directly addresses the current shared navigation and ambiguous `OWNER` role.

### 2. Explicit relationship and invitation

Owner access should come from a user/person-to-ownership/portfolio assignment; tenant access should come from a verified user/person-to-lease-party link. TenantCloud and AppFolio's connection/activation patterns are more secure than deriving access from an email string.

### 3. Task-first tenant home

The tenant dashboard should prioritize next amount due/Pay, current lease/unit, urgent notices, invoices/receipts, maintenance, documents, and space requests. Management KPIs are inappropriate here.

### 4. Portfolio-first owner home

Owners need assigned properties, occupancy/performance, collected/outstanding, statements, documents, maintenance, and approvals. They should not receive organization staff permissions or see other owners/bank configuration.

### 5. Linked operational workflow

Lease schedule → invoice → reminder/payment → allocation/receipt → reconciliation should be traceable. Each summary number drills into the filtered records that compose it.

### 6. Controlled report sharing

Owner/tenant exports must use the same server-side scope as lists. Generated files should be access-controlled snapshots with audit history, not public object URLs.

## Open-source GitHub references

### MicroRealEstate

- Repository: [microrealestate/microrealestate](https://github.com/microrealestate/microrealestate)
- License: MIT, according to the repository license/readme.
- Maintenance signal: the repository shows limited release cadence relative to the larger ERP references; verify its current commits and releases at the exact implementation-review date rather than relying on cached counts.
- Architecture/technology: web-based real-estate management project; its repository should be inspected at a pinned commit before any deeper technical comparison.
- Useful patterns: landlord-centric property/tenant/rent navigation, domain vocabulary, and a compact open-source benchmark for feature coverage.
- Reuse decision: MIT is generally permissive, but **no code reuse is approved by this report**. The older alpha release signal and different architecture raise maintenance/integration risk. If a specific component is proposed later, record exact file/commit/license notices and security-review it.

### ERPNext

- Repository: [frappe/erpnext](https://github.com/frappe/erpnext)
- License: GPL-3.0, shown on the repository.
- Maintenance signal: active release history is visible on [ERPNext releases](https://github.com/frappe/erpnext/releases). Recheck the current release and support branch before adopting any pattern; cached counts are intentionally not retained.
- Architecture/technology: Python/Frappe ERP application with extensive accounting, document, workflow, reporting and role concepts.
- Useful patterns: immutable submitted financial documents, receivable reports, audit/workflow state, numbering, print formats, and permission-aware workspaces.
- Reuse decision: **patterns only**. GPL-3.0 code must not be copied or linked into NoAgent4U without explicit legal/product-owner approval and a distribution analysis. Its ERP breadth would also pull the project away from the current focused NestJS/Next.js modular monolith.

### Frappe Framework

- Repository/license: [frappe/frappe](https://github.com/frappe/frappe); framework license is MIT in its [LICENSE](https://github.com/frappe/frappe/blob/develop/LICENSE).
- Maintenance signal: actively maintained alongside ERPNext, with current 2026 releases visible.
- Useful patterns: metadata-driven permissions, document lifecycle, audit/versioning, background jobs, notifications, and configurable print formats.
- Reuse decision: patterns and terminology only. Even where framework code is MIT, importing a Python metadata framework is technically inappropriate for this repository; ERPNext application code has separate GPL obligations.

### Odoo Community

- Repository: [odoo/odoo](https://github.com/odoo/odoo)
- License: review the exact branch/file in the repository [LICENSE](https://github.com/odoo/odoo/blob/19.0/LICENSE); Odoo Community core is commonly distributed under LGPL-3.0, while Enterprise/add-ons and assets can have different terms.
- Maintenance signal: large, actively maintained repository with current branches and substantial Python/JavaScript code. Exact counts and release state should be refreshed when evaluating a pinned version.
- Architecture/technology: modular Python business applications with integrated web client and module manifests.
- Useful patterns: modular navigation, record views, activities/chatter, scheduled actions, accounting states, and configurable access rules.
- Reuse decision: **patterns only until counsel reviews the exact module and license**. Do not assume every Odoo rental/property feature is in the LGPL community repository; enterprise or third-party modules may be proprietary, LGPL, GPL, AGPL, or other licenses.

## License and reuse policy

| License/source            | Default action for NoAgent4U                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| MIT/Apache-2.0/BSD        | Still require exact commit/file provenance, notices, dependency/security review, and product approval before copying. |
| LGPL                      | Legal review required for linkage/modification/distribution obligations; avoid source copying by default.             |
| GPL-3.0                   | Do not introduce code without explicit licensing-impact approval. Pattern research only.                              |
| AGPL-3.0                  | Do not introduce code without explicit approval; network-use source obligations can be material.                      |
| Proprietary/commercial UI | Do not copy code, assets, text, or distinctive visual design. Use generalized workflow patterns only.                 |

Screenshots and vendor marketing assets are references, not reusable design assets.

## Gap comparison

| Pattern in current references         | NoAgent4U today                               | Recommended response                                                       |
| ------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| Separate owner/tenant/manager portals | One shared authenticated shell                | Create separate frames and server-side scopes.                             |
| Explicit tenant connection to a lease | Lease party contact only                      | Add verified person/user linkage and invitation.                           |
| Owners see assigned properties only   | `PropertyOwnership` not used in authorization | Make ownership/portfolio assignment a resource policy.                     |
| Tenant online payment and history     | Payment backend only, no gateway/tenant UI    | Add gateway/reconciliation after identity/RBAC.                            |
| Maintenance request lifecycle         | No model/API/UI                               | Add after tenant identity and uploads.                                     |
| Owner financial reports and exports   | No report/read model                          | Add scoped portfolio/aging/statement projections.                          |
| Document access and agreements        | Storage-key registration only                 | Add secure storage, templates, immutable renders and sharing rules.        |
| Communication status                  | Outbox worker foundation/no real delivery     | Wire one email provider first, then logs/SMS/WhatsApp.                     |
| Rich accounting/reconciliation        | Invoice/payment foundation only               | Preserve focused lease-to-cash scope; avoid accidental full ERP expansion. |

## References not required from the product owner

The requirements and public research are sufficient to propose the light-theme direction, information architecture, and P0/P1 workflow plan. Product-owner screenshots are optional. Request them only if an exact existing brand or competitor look-and-feel must be matched. Brand assets, preferred typography, and any formal identity guide would be more useful than screenshots.

## Product-owner decisions

1. Confirm which commercial reference best reflects the target product breadth: focused landlord/manager platform or full accounting-heavy suite.
2. Confirm that public references are for patterns only and that no third-party code reuse is approved by default.
3. Confirm whether a future vendor/service-professional portal is in scope; recommendation is to defer it.
4. Confirm the countries, currencies, legal document requirements, and target property types before treating competitor feature labels as local requirements.
