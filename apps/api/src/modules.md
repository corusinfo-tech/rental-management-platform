# Bounded-context implementation map

| Context | API ownership | Persistence |
|---|---|---|
| Authentication / Users | `/auth`, `/users` | `users`, refresh-token hash |
| Properties / Units | `/properties`, `/units` | `properties`, `units` |
| Agreements | `/agreements` | `rental_agreements` |
| GST / Templates | `/gst-profiles`, `/invoice-templates` | `gst_profiles`, `invoice_templates` |
| Invoices / Payments | `/invoices`, `/payments` | `invoices`, `payments` |
| Maintenance | `/maintenance-requests` | `maintenance_requests` |
| Notifications | `/notifications` | `notifications` + BullMQ |
| Documents | `/documents` | `documents` + object storage port |
| Reports / Billing | `/reports`, `/subscriptions` | reporting projections / subscription provider |

The initial runnable controllers focus on authentication, agreements, and invoices. The remaining contexts have schema ownership established and should be completed with the same controller → application service → repository pattern before exposing them to production users.
