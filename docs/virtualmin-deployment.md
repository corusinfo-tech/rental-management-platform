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

## 2. Create and apply migrations

Before the first production deployment, create and review an initial Prisma migration in development or CI:

```bash
pnpm --filter @rentalos/api prisma:migrate --name init
git add apps/api/prisma/migrations
git commit -m "add initial database migration"
```

On the server, every release then applies only committed migrations:

```bash
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec api ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
```

Confirm health locally on the VPS: `curl http://127.0.0.1:3001/api/v1/health`.

## 3. Configure the Virtualmin reverse proxies

In each Virtualmin virtual server, add the relevant text under **Server Configuration → Website Options → Additional Apache directives** (exact menu wording can vary by Virtualmin theme). Ensure Apache's `proxy` and `proxy_http` modules are enabled in Webmin first.

For `noagent4u.com`:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
RequestHeader set X-Forwarded-Proto "https"
```

For `api.noagent4u.com`:

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3001/
ProxyPassReverse / http://127.0.0.1:3001/
RequestHeader set X-Forwarded-Proto "https"
```

Apply the configuration and reload Apache from Virtualmin/Webmin. Use the equivalent proxy-pass settings if the VPS has been configured with Nginx instead of Apache.

## 4. Operational checks and releases

Set the web application's public API base URL to `https://api.noagent4u.com/api/v1` at build time once client API calls are added. Verify `https://api.noagent4u.com/docs`, login, invoice generation, and background delivery after every release.

Deploy a release with:

```bash
cd /opt/rentalos
git pull --ff-only
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec api ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
docker image prune -f
```

Back up the `postgres_data` volume daily (use a `pg_dump` job, not filesystem copying while PostgreSQL runs), persist off-server backups, and regularly test restoration. Monitor `docker compose -f docker-compose.production.yml logs -f api` and configure a remote log sink before production go-live.
