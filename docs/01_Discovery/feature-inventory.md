# Feature Inventory

**Status definitions:** **Implemented** = functional source/API exists; **Partial** = model/scaffold exists but workflow is incomplete; **Planned** = described in architecture only; **Missing** = neither implementation nor sufficient scaffold.

| Category | Inventory | Status | Dependencies | Recommendations |
|---|---|---|---|---|
| Authentication | Register, login, JWT refresh, Argon2 passwords | Partial | User/Tenant schema, JWT secrets | Secure bootstrap, logout, reset, verification, MFA, sessions/rate limits. |
| Users | User schema only | Partial | Auth, tenant policy | Add CRUD/profile/invites/roles/activation with ownership checks. |
| Admin | Shared role on agreement/invoice writes | Partial | RBAC, audit log | Add admin tenant/settings/user/audit/report APIs; no admin UI exists. |
| Landlord | Shared role on agreement/invoice writes | Partial | Properties, units, agreements | Add landlord dashboard, property/unit management and scoped authorization. |
| Tenant | Role/schema only | Missing | Agreements, invoices, payments | Build tenant portal, invoice/payment visibility, maintenance and notifications. |
| Properties | Schema only | Partial | Tenant, units | Implement CRUD/list/detail/search and tenancy rules. |
| Units | Schema only | Partial | Properties, agreements | Implement CRUD, availability, amenities and lifecycle. |
| Amenities | No model/API/UI | Missing | Properties/units | Define amenity catalog/link model only if product requirement is confirmed. |
| Applications | No model/API/UI | Missing | Users, units, screening | Define applicant workflow, consent and data-retention policy before build. |
| Agreements | Create and status update API/schema | Partial | Unit/property/user ownership | Add lifecycle, list/detail/edit, activation/vacate/cancel policies and tests. |
| Invoices | Manual generate API, schema, GST math, queue enqueue | Partial | Agreements, GST, templates, worker | Add line items, GST profiles/templates/PDF/list/void/resend/status/delivery worker. |
| Payments | Payment schema only | Partial | Invoices, gateway | Select gateway; build payment, webhook, reconciliation/refund/receipt workflows. |
| Maintenance | Schema only | Partial | Units/users/documents | Build requests, assignment, comments, vendor/attachment/status APIs and UI. |
| Notifications | Schema/queue channel names only | Partial | BullMQ worker, provider SDKs | Add preferences/templates/device tokens/delivery attempts/providers. |
| Reports | No implementation | Planned | Complete transactional data | Define metrics, access control, exports and retention. |
| Settings | GST/template schema only | Partial | Tenant/admin policy | Add tenant/profile/GST/template/notification settings APIs/UI. |
| Dashboard | Static cards/button | Partial | Auth/API/reporting | Replace placeholders with authorized API-driven metrics and action flows. |
| Mobile | Flutter static shell | Partial | Stable API/auth contracts | Defer feature parity until web/API foundations are complete. |

## Product Dependencies and Sequencing

1. Secure tenant/user management and property/unit CRUD.
2. Complete agreement lifecycle and tenant/owner authorization.
3. GST/template/invoice line items plus document generation/delivery.
4. Payments and reconciliation.
5. Maintenance/notifications/documents.
6. Reports, subscriptions and mobile feature parity.
