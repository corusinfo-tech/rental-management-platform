# Risk Register

| ID | Description | Category | Probability | Impact | Priority | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| R-001 | Public users can self-create privileged tenant accounts | Security | High | Critical | Critical | Secure bootstrap/invite role flow; authorization tests | Backend lead | Open |
| R-002 | Cross-tenant data/action due to missing object checks/FKs | Security/Database | Medium | Critical | High | Service policies, FKs, RLS defence, tests | Backend/DB lead | Open |
| R-003 | Unreproducible dependency/database releases | Deployment | High | High | High | Commit lockfile/migrations; frozen CI builds | Engineering lead | Open |
| R-004 | Invoices marked/assumed delivered without worker | Business/Operational | High | High | High | Worker, provider state, retry/monitoring | Product/backend lead | Open |
| R-005 | VPS reverse proxy routes API to legacy Django | Infrastructure | Medium | High | High | Remove WSGI conflict; test vhost/cert/proxy release checklist | DevOps owner | Open |
| R-006 | Single VPS failure loses availability/data | Infrastructure | Medium | High | High | Off-server backups, restore drills, monitoring, DR plan | Operations owner | Open |
| R-007 | Brute-force/API abuse due to inactive throttling | Security | High | Medium | High | Enable guard, auth limits, monitoring/account lockout | Backend lead | Open |
| R-008 | Missing financial/payment controls cause accounting errors | Business/Database | Medium | High | High | Line items/idempotency/webhooks/reconciliation design | Product/finance lead | Open |
| R-009 | Static frontend creates false launch readiness | Business | High | Medium | Medium | Define MVP acceptance criteria and API-integrated flows | Product lead | Open |
| R-010 | Database growth degrades audit/notification queries | Performance | Medium | Medium | Medium | Index, retention, archive/partition policy | DB lead | Open |
| R-011 | Secrets leak through Docker context or VPS operations | Security | Medium | High | High | `.dockerignore`, secret manager, rotation, scanning | DevOps owner | Open |
| R-012 | Third-party provider choice delays payments/notifications | Business | Medium | Medium | Medium | ADR/provider evaluation with compliance/cost criteria | Product architect | Open |
