# Deploy on a Virtualmin/Webmin VPS

This deployment model leaves Virtualmin in charge of virtual hosts, TLS certificates, DNS, and mail. Docker Compose owns RentalOS and its private PostgreSQL/Redis network. Do not expose ports 5432 or 6379 publicly.

## 1. Prepare the server

Install Docker Engine plus the Docker Compose plugin using Docker's official instructions for the VPS distribution. Ensure the firewall permits only SSH, HTTP (80), and HTTPS (443). Create a Virtualmin virtual server for `noagent4u.com` (including `www.noagent4u.com` as an alias if desired) and another for `api.noagent4u.com`; obtain a Let's Encrypt certificate for each in Virtualmin.

Clone this repository outside Virtualmin's public web root, for example `/opt/rentalos`:

```bash
sudo mkdir -p /opt/rentalos
sudo chown "$USER":"$USER" /opt/rentalos
git clone <YOUR_REPOSITORY_URL> /opt/rentalos
cd /opt/rentalos
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production`. Generate unique secrets with `openssl rand -base64 48`; URL-encode any special characters placed in `DATABASE_URL`.

## 2. Apply committed migrations

Create and review migrations in development or CI. Production must only apply
the committed migrations under `prisma/migrations`; never use `db push` or
`migrate dev` against the production database.

Before each release, take and verify a PostgreSQL backup. Then build the release
images, run the one-shot migration target, and only start the application after
that command succeeds:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-build api worker web
```

`prisma migrate deploy` is idempotent, but a non-zero exit is a release blocker.
Inspect the migration output and PostgreSQL logs before retrying; do not start a
new application revision against an older schema.

Confirm health locally on the VPS: `curl http://127.0.0.1:3001/health`.

## 3. Configure the Virtualmin reverse proxies

In each Virtualmin virtual server, add the relevant text under **Server Configuration → Website Options → Additional Apache directives** (exact menu wording can vary by Virtualmin theme). Ensure Apache's `proxy` and `proxy_http` modules are enabled in Webmin first.

For `noagent4u.com`:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
RequestHeader set X-Forwarded-Host "noagent4u.com"
RequestHeader set X-Forwarded-Proto "https"
```

For `api.noagent4u.com`:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3001/
ProxyPassReverse / http://127.0.0.1:3001/
RequestHeader set X-Forwarded-Host "api.noagent4u.com"
RequestHeader set X-Forwarded-Proto "https"
```

`ProxyPreserveHost On` preserves the public `Host` header. The explicit
`X-Forwarded-Host` and `X-Forwarded-Proto` values must be overwritten by the
trusted proxy rather than accepted from the public request. Apply the
configuration and reload Apache from Virtualmin/Webmin. For Nginx, use the
equivalent trusted headers:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 4. Operational checks and releases

Verify `https://api.noagent4u.com/docs`, login, organization pages, invoice generation, and background delivery after every release.

Deploy a release with:

```bash
cd /opt/rentalos
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml build migrate api worker web
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml up -d --no-build api worker web
docker image prune -f
```

Back up the `postgres_data` volume daily (use a `pg_dump` job, not filesystem copying while PostgreSQL runs), persist off-server backups, and regularly test restoration. Monitor `docker compose --env-file .env.production -f docker-compose.production.yml logs -f api` and configure a remote log sink before production go-live.
