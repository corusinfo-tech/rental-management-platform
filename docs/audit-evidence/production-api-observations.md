# Production API evidence retained during the 2026-07-19 audit

This file preserves the evidence chain for the statement that the authenticated management pages consume real endpoints. It contains no credentials, tokens, secret headers, or personal data.

## Browser observations

| Route         | Rendered production result                                                                                    | Screenshot                     |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `/dashboard`  | Organization record, one property, and zero lease/invoice/payment totals rendered after authenticated loading | `authenticated-dashboard.png`  |
| `/properties` | Property `Malikayil Building` (`0001`) and database-backed counts rendered                                    | `authenticated-properties.png` |
| `/leases`     | API-backed empty result rendered                                                                              | `authenticated-leases.png`     |
| `/invoices`   | API-backed empty result rendered                                                                              | `authenticated-invoices.png`   |
| `/payments`   | API-backed empty result rendered                                                                              | `authenticated-payments.png`   |
| `/settings`   | Backend error text `Organization settings not found` rendered through the page error state                    | `authenticated-settings.png`   |

The browser automation backend did not expose a HAR/response-status export. No status code or response body is invented here. Successful data/empty-state rendering and the explicit Settings backend error are retained alongside the exact request wiring and automated tests below.

## Exact request wiring

- `apps/web/app/dashboard/page.tsx` calls the authenticated BFF for:
  - `/platform-api/v1/organizations/:organizationId`
  - `/platform-api/v1/organizations/:organizationId/properties`
  - `/platform-api/v1/organizations/:organizationId/leases`
  - `/platform-api/v1/organizations/:organizationId/invoices`
  - `/platform-api/v1/organizations/:organizationId/payments`
- `apps/web/components/management/entity-list.tsx` calls the organization-scoped lease/invoice/payment paths with search and pagination.
- `apps/web/app/properties/page.tsx` calls the property GET and POST paths.
- `apps/web/app/settings/page.tsx` calls settings GET and PATCH paths.
- `apps/web/app/platform-api/[...path]/route.ts` forwards the method, bearer authorization, content type, query string, request body, upstream response bytes, content type, and status to the NestJS internal API. Mutations additionally enforce the browser-origin check.
- `apps/web/lib/platform-client.ts` rejects non-2xx or unsuccessful response envelopes instead of substituting mock data.

## Automated evidence

- `apps/web/test/management-api-wiring.test.mjs` asserts the page-to-BFF and BFF-to-Nest endpoint wiring.
- `apps/web/test/auth-routing.test.mjs` covers authenticated routing/proxy source behavior.
- API service tests verify the property-descendant lease/invoice/payment implementations and Phase 1 authorization policies.

This evidence supports “real endpoint wiring and real rendered production records.” It does not claim that every role, mutation, or production response was verified; those remain classified separately in the audit.
