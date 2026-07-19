# NoAgent4U UI/UX and Theme Audit

Audit date: 2026-07-19

## Executive summary

The authenticated interface is coherent enough to demonstrate a working product foundation, but it is not yet an efficient property-management workspace. The same horizontal header and navigation serve every role, the dashboard contains only four totals, and most domain pages are generic lists with few actions. The dark navy/blue visual treatment dominates every surface and suppresses information hierarchy. A light, neutral default theme with a restrained teal/emerald accent is recommended.

The most serious UI problem is responsive behavior. In the 390px production capture, navigation clips horizontally and the Dashboard's organization card collapses into a narrow vertical strip. Settings displays its production error in the same narrow layout. These are functional usability defects, not theme-only issues.

## Evidence reviewed

- `apps/web/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/components/management/app-shell.tsx`
- `apps/web/components/management/entity-list.tsx`
- Authenticated page components under `apps/web/app`
- Production captures in [`docs/audit-evidence`](./audit-evidence/)

## Current design system

| Element           | Current state                                                                         | Assessment                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color             | Dark navy page/surfaces with pale text and a light active tab; blue/charcoal emphasis | Consistent but visually heavy; state colors and semantic tokens are underdeveloped. `PARTIAL`.                                                    |
| Typography        | System-style sans serif, large page title, modest supporting text                     | Readable, but no clear data-density/type scale for operational tables and metadata. `PARTIAL`.                                                    |
| Layout            | Top header plus horizontal tabs; single content column                                | Works at narrow desktop widths but does not scale to many modules or role-specific navigation. `PARTIAL`.                                         |
| Cards             | Repeated bordered dark rectangles                                                     | Too much vertical space for simple metrics; weak grouping and comparison. `PARTIAL`.                                                              |
| Tables/lists      | One recent-properties table and a generic entity list                                 | Lacks sticky headers, column control, bulk actions, compact density, domain filters, and mobile transformation. `PARTIAL`.                        |
| Forms             | Basic labeled inputs/buttons and an inline create-property form                       | Usable foundation, but no step grouping, contextual validation pattern, destructive-action confirmation, or unsaved-change safeguards. `PARTIAL`. |
| Status            | Small outlined labels                                                                 | No system-wide badge mapping for success/warning/error/neutral or lifecycle semantics. `PARTIAL`.                                                 |
| Loading           | Text-based loading in pages/lists                                                     | Functional but visually unstable; no skeletons or reserved layout. `PARTIAL`.                                                                     |
| Empty states      | Basic explanatory text in generic lists                                               | No role-specific next action or permission-aware guidance. `PARTIAL`.                                                                             |
| Error states      | Inline error text/alert                                                               | Settings proves errors surface, but recovery and support detail are weak. `BROKEN` on Settings.                                                   |
| Charts            | None                                                                                  | `MISSING`; only useful decision-oriented charts should be added.                                                                                  |
| Component library | A local Button and small shared management/auth components                            | Package `packages/ui` is effectively a shell; design tokens are not a mature shared system. `STUB`.                                               |

## Route-by-route usability findings

### Dashboard

- Four vertically stacked cards show Properties, Leases, Invoices, and Payments. They do not answer occupancy, cash collection, overdue risk, lease-expiry, or action-queue questions.
- Totals lack a period, comparison, trend, scope label, and drill-down behavior.
- Recent Properties is the only detailed section.
- The page makes several list calls rather than consuming one time-consistent dashboard projection.
- At 390px, the current-organization card collapses and header/navigation content is clipped.
- Status: `PARTIAL`.

### Properties

- The real property card presents name, code, type, address, and counts for buildings/images/documents.
- It omits owner, units, occupancy, active leases, expected rent, outstanding, and actions.
- Search exists, but API-supported filters/sort/pagination are not exposed.
- The add form is immediately expanded rather than a guided drawer/modal/page and supports only foundation fields.
- No link or contextual menu opens property detail.
- Status: `PARTIAL`.

### Leases, Invoices, Payments

- All three use `EntityList`, which is useful for a scaffold but not a domain workflow.
- Search and page navigation exist, but required columns, filters, status treatment, saved views, row actions, detail drawers, export, and bulk operations do not.
- The production empty states prove real API connectivity, but they do not guide the authorized user to create/import/resolve records.
- Status: `PARTIAL`.

### Settings

- The page has a real GET/PATCH form path, but production returns `Organization settings not found`.
- The error has no Retry, Initialize defaults, contact/support code, or diagnostic request ID.
- The narrow error layout is hard to scan.
- Status: `BROKEN`.

## Navigation and information architecture

The horizontal navigation should be replaced by a role-aware application frame. A persistent desktop sidebar and compact mobile drawer/bottom-priority navigation will scale better and avoid clipping.

Recommended organization workspace:

```text
Overview
Portfolio
  Properties
  Buildings & Units
People
  Owners
  Tenants
  Staff & Access
Leasing
  Leases
  Expiries & Renewals
Finance
  Invoices
  Payments
  Collections
Requests
  Maintenance
  Space Requests
Communications
  Delivery Log
  Templates
Reports
Settings
  Organization & Branding
  Billing Rules
  Integrations
  Roles & Permissions
  Audit History
```

Platform administration should be a separate console, not another item in the organization sidebar:

```text
Platform Overview
Organizations
Approvals & Compliance
Platform Administrators
Service Health
Integration Failures
Platform Audit
```

Owner and tenant portals should use smaller task-focused navigation and must be backed by resource-scoped APIs.

## Recommended dashboard hierarchy

Every number must expose scope, period, source timestamp, and a drill-down target.

```text
┌ Header: Organization switcher | period | global search | alerts | user ┐
├ Action strip: overdue risk, failed jobs, leases expiring, open requests ┤
├ KPI row: occupancy | invoiced | collected | outstanding | collection % ┤
├ Collections trend (period comparison) ─── Occupancy by property          ┤
├ Aging buckets with drill-down ─────────── Lease expiries 30/60/90       ┤
├ Work queue: approvals, unreconciled payments, reminders, requests       ┤
├ Recent activity ───────────────────────── Quick actions                 ┤
└ Portfolio table: property health, units, rent, outstanding, actions     ┘
```

Useful charts only:

- Invoiced versus collected by month: answers whether collection is improving.
- Aging-bucket stacked bar: shows where debt is concentrating.
- Occupied/vacant/maintenance by property: reveals portfolio capacity and maintenance drag.
- Lease-expiry timeline: shows upcoming renewal workload.

Do not add pie charts for totals already visible in cards or charts without a click-through query.

## Role-specific dashboard content

### Organization administrator/property manager

Prioritize occupancy, lease expiry, collections, unreconciled payments, requests, failed delivery/jobs, and staff actions. Quick actions should be permission-aware.

### Property owner

Show only owned/authorized properties: property performance, occupancy, expected/collected/outstanding rent, statements, documents, maintenance, and approval tasks. Do not expose organization bank details or other owners.

### Tenant

Lead with current unit/lease, amount and next due date, Pay action when enabled, overdue notices, invoices/receipts, agreement, maintenance, space request, and communication preferences. Avoid management-oriented terminology.

## Proposed light theme

The warm-neutral/emerald palette is the approved design direction. It is not a final locked visual design; exact values, typography, density, and component treatments remain subject to implementation validation and product review.

| Token              | Proposed default           | Use                                 |
| ------------------ | -------------------------- | ----------------------------------- |
| `--page`           | `#F7F7F3` warm off-white   | Main background                     |
| `--surface`        | `#FFFFFF`                  | Cards, tables, dialogs              |
| `--surface-subtle` | `#F1F3EF`                  | Grouped controls, alternate rows    |
| `--border`         | `#DDE2DC`                  | Dividers and inputs                 |
| `--text`           | `#202522`                  | Primary text                        |
| `--text-muted`     | `#66706A`                  | Secondary metadata                  |
| `--primary`        | `#16715B` muted emerald    | Primary actions and selected states |
| `--primary-hover`  | `#115B49`                  | Hover/pressed                       |
| `--success`        | `#2E7D4F`                  | Paid, active, reconciled            |
| `--warning`        | `#B7791F`                  | Pending, expiring, attention        |
| `--danger`         | `#B93838`                  | Overdue, failed, destructive        |
| `--info`           | `#47748A` desaturated blue | Informational states only           |

Theme guidance:

- Default to light mode; retain dark mode as an accessible alternative after semantic tokens are complete.
- Use color plus icon/text, never color alone, for lifecycle status.
- Use white content surfaces with subtle borders; reserve shadows for overlays and focused elevation.
- Standardize radii (8px controls, 12px cards/dialogs) and spacing on a 4px base scale.
- Use one clear primary action per view. Destructive actions require confirmation and consequence text.
- Use tabular numerals for financial figures and align currency columns right.

## Core components to build

1. Role-aware `AppFrame`: sidebar, mobile drawer, breadcrumbs, organization switcher, global search, notifications, account menu.
2. `PageHeader`: title, description, period/scope, primary and secondary actions.
3. `KpiCard`: value, unit/currency, scope, comparison, status, drill-down, loading/error state.
4. `DataTable`: server filters/sort/page, column visibility, row/bulk actions, saved views, responsive card mode.
5. `FilterBar`: status, owner, property, tenant, date range and clear-all behavior encoded in URL parameters.
6. `StatusBadge`: centrally mapped lifecycle labels and accessible icons.
7. `ActionQueue`: priority, owner, due time, status, contextual resolution.
8. `EmptyState`, `ErrorState`, and `Skeleton`: consistent recovery and layout stability.
9. `DetailLayout`: summary header, tabs, activity rail, contextual actions.
10. `Money`, `Date`, `Percentage`, and privacy-safe identity display primitives.

Build these in the existing web app first; promote stable primitives into `packages/ui` only when reuse is proven.

## Accessibility audit

Code review suggests basic semantic buttons/inputs, but no automated or assistive-technology evidence exists. Status: `NOT VERIFIED` because axe, keyboard, screen-reader, and contrast tests were not present or run across representative workflows.

Required acceptance criteria:

- WCAG 2.2 AA contrast for text, focus, controls, and status badges.
- Complete keyboard navigation with visible focus and no focus traps.
- Logical heading/landmark structure and a skip-to-content link.
- Labels, descriptions, errors, and required state programmatically associated with inputs.
- Tables retain headers and relationships; responsive cards expose equivalent labels.
- Dialog focus is trapped/restored; destructive confirmations announce consequences.
- Live regions announce async save, filter, pagination, and error results without excessive noise.
- Reduced-motion support and non-color status cues.
- 200% zoom and 320px viewport without horizontal page scrolling.

## Responsive requirements

| Breakpoint/use | Required behavior                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 320–479px      | Drawer navigation; single-column KPIs; no collapsed fixed-width card; data tables transform to labeled cards or controlled horizontal region; sticky primary action only when it does not obscure content. |
| 480–767px      | Two-column small KPIs where readable; filters in sheet; detail tabs horizontally scroll within their own region.                                                                                           |
| 768–1199px     | Collapsible sidebar; 2–3 KPI columns; tables retain priority columns.                                                                                                                                      |
| 1200px+        | Persistent sidebar; dense tables; dashboard grid with controlled maximum width.                                                                                                                            |

Add Playwright visual and interaction checks at 390x844, 768x1024, 1280x800, and 1440x900. The acceptance rule is no document-level horizontal overflow.

## Content and terminology

- Distinguish platform organization, management company, property owner, tenant, lease party, and unit occupant.
- Use `Outstanding` for unpaid balance and reserve `Overdue` for balance past due.
- Show explicit status labels; do not derive `Expiring soon` as a persisted lease status unless product rules require it. It is usually a computed indicator.
- Label financial periods and currency everywhere.
- Empty states should explain why no data exists and show an allowed next step, such as `Create lease`, not a generic absence message.

## UI implementation sequence

1. Fix mobile overflow/collapse and Settings error recovery without changing business scope.
2. Establish semantic tokens, typography, status mapping, focus styles, and light default.
3. Build role-aware frame and route guards after API RBAC policies are settled.
4. Build shared server-driven table/filter/detail patterns.
5. Replace the four-card dashboard with scoped KPI/read-model data and action queues.
6. Complete Properties/Units, Leases, Invoices, Payments, and Collections workflows.
7. Build owner and tenant portals on dedicated scoped APIs.
8. Run accessibility, responsive, visual-regression, and task-usability checks.

## Decisions requiring approval

- Warm-neutral/emerald is approved as the design direction, but not as a final locked visual design; provide any existing brand constraints before final visual sign-off.
- Confirm default light mode while retaining optional dark mode.
- Confirm whether the organization workspace should use a persistent sidebar.
- Confirm desired density: compact financial operations tables are recommended on desktop with comfortable mobile cards.
- Approve role-specific navigation labels after the principal/role decisions in the main audit.
