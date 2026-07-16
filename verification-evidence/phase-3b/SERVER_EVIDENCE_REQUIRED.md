# Server Evidence Required

No SSH or production Docker/database shell was available to this validation session. Run these commands on the production host and preserve sanitized output.

```bash
git rev-parse HEAD
git status --short
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml images
docker compose -f docker-compose.production.yml logs --since=30m api web worker
docker compose -f docker-compose.production.yml exec -T api node -e "fetch('http://127.0.0.1:3001/health').then(async r => { console.log(r.status, await r.text()); process.exit(r.ok ? 0 : 1) })"
docker compose -f docker-compose.production.yml exec -T worker node -e "fetch('http://127.0.0.1:3011/health/ready').then(async r => { console.log(r.status, await r.text()); process.exit(r.ok ? 0 : 1) })"
```

PostgreSQL evidence must show, with secrets and hashes excluded:

- One new session per successful login.
- Refresh creates a replacement session and revokes the parent.
- Replay revokes the token family.
- Logout sets `revokedAt` and a safe reason.
- Expired sessions cannot be used.
- Audit events exist for success and failure cases.
- Verification and reset produce expected outbox/envelope records without plaintext tokens.

Worker evidence must show:

- Verification event claimed once.
- Envelope decrypted only at the worker boundary.
- SMTP accepted one message with an idempotency key.
- Envelope destroyed after success.
- Retry/backoff and dead-letter recovery were exercised.
- Delivery audit event was written once.
