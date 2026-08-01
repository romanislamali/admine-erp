# Deployment Guide — `eoffice.adminead.com` on a VPS

This document is the complete, step-by-step guide for taking this Docker Compose stack from a
local machine to a publicly reachable VPS at `https://eoffice.adminead.com`.

## Background / why a VPS

`adminead.com` already has a live website on it, with DNS hosted on **Netlify DNS** (nameservers
`dns1-4.p05.nsone.net`). Public lookups show:

```
adminead.com       A   13.215.239.219, 52.74.6.109
www.adminead.com   A   13.215.239.219, 52.74.6.109
MX                 (none — no email on this domain)
```

The plan is to leave all of that untouched and add one **new, independent** DNS record for the
`eoffice` subdomain pointing at a VPS that runs this project. A laptop was considered but rejected
because it has no static public IP and exposing a home router to the internet (port forwarding) is
risky; a VPS has its own public IP and is meant to be internet-facing.

## 1. Provision the VPS

- **Provider**: Hetzner Cloud (cheapest for the specs, e.g. CX22) or DigitalOcean (more
  beginner-friendly dashboard) both work fine. Any provider is fine.
- **Size**: at least 2GB RAM / 1-2 vCPU. This stack runs Postgres + the Node backend + the Vite dev
  server + Nginx together; 1GB is too tight.
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS.
- After creation, note the VPS's **public IPv4 address** and confirm you can SSH in:
  ```bash
  ssh root@<VPS_IP>
  ```

## 2. Initial server setup

Run on the VPS as root (or a sudo user):

```bash
# Update packages
apt update && apt upgrade -y

# Basic firewall — only allow SSH, HTTP, HTTPS
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Install Docker + Docker Compose plugin
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# (Optional but recommended) run Docker as a non-root user
usermod -aG docker $USER
```

## 3. Get the project onto the VPS

From your own machine, or directly on the VPS if you push this repo somewhere you control:

```bash
git clone <your-repo-url> admine-erp
cd admine-erp
```

If you don't have a remote to clone from, `rsync`/`scp` the project directory to the VPS instead —
just make sure `node_modules` and `.git` aren't copied unnecessarily.

## 4. Configure production environment

Copy the example file and fill in **production** values — do not reuse local development secrets:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set, at minimum:
- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — new, strong credentials (do not reuse dev ones)
- `JWT_SECRET` — generate a fresh one, e.g. `openssl rand -hex 32`
- `ALERT_EMAIL` / `ALERT_EMAIL_PASSWORD` — production alert mailbox, if used
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_DRIVE_FOLDER_ID` —
  only if the Google Drive backup feature is used in production
- `HTTP_PORT=80`, `HTTPS_PORT=443` (so Nginx binds the standard ports directly)

`backend/.env` is already gitignored — never commit it.

## 5. Point DNS at the VPS

Since the domain's DNS is hosted on Netlify DNS, log into the Netlify account that owns
`adminead.com`, open its DNS panel, and add:

| Type | Name      | Value           |
|------|-----------|-----------------|
| A    | `eoffice` | `<VPS_IP>`      |

Do **not** modify the existing `@` or `www` records — this is a new, independent record for the
subdomain only. DNS propagation is usually fast (minutes) but can take up to ~24h.

Verify it resolves before moving on:
```bash
dig +short eoffice.adminead.com A
# should print <VPS_IP>
```

## 6. Start the stack

```bash
make up
```

This builds and starts `db`, `backend`, `frontend`, and `nginx`. Confirm it's reachable over plain
HTTP first (before SSL):
```bash
curl -H "Host: eoffice.adminead.com" http://<VPS_IP>/
curl -H "Host: eoffice.adminead.com" http://<VPS_IP>/api/health
```

## 7. Issue a real SSL certificate (Let's Encrypt / Certbot)

The Dockerized Nginx already has an ACME-challenge location configured in
[nginx/conf.d/default.conf](nginx/conf.d/default.conf) pointing at `/var/www/certbot`, backed by the
`./nginx/certbot-www` directory. Once `eoffice.adminead.com` resolves to the VPS and port 80 is
reachable (step 6), request the certificate using the Certbot webroot method:

```bash
docker run --rm \
  -v "$(pwd)/nginx/certbot-www:/var/www/certbot" \
  -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d eoffice.adminead.com \
  --email <your_email> --agree-tos --no-eff-email
```

Then uncomment the HTTPS `server` block at the bottom of
[nginx/conf.d/default.conf](nginx/conf.d/default.conf) (already prewritten, referencing
`/etc/letsencrypt/live/eoffice.adminead.com/fullchain.pem` and `privkey.pem`), and reload:

```bash
make nginx-test
make nginx-reload
```

**Renewal**: certificates expire every 90 days. Set up a cron job on the VPS to renew and reload:
```bash
# crontab -e
0 3 * * * cd /path/to/admine-erp && docker run --rm -v "$(pwd)/nginx/certbot-www:/var/www/certbot" -v "$(pwd)/nginx/ssl:/etc/letsencrypt" certbot/certbot renew --webroot -w /var/www/certbot --quiet && docker compose --env-file ./backend/.env exec nginx nginx -s reload
```

## 8. Verify

Visit `https://eoffice.adminead.com` from any device with internet access. It should load the
frontend, and `https://eoffice.adminead.com/api/health` should return
`{"status":"OK","message":"Backend is running"}`.

## Notes for later

- The frontend is built as a static production bundle (`frontend/Dockerfile` does `npm run build`
  and serves the result via its own Nginx on port 80); it's no longer running the Vite dev server.
  Rebuilding (`make up` after a `git pull`) is required to pick up frontend code changes — there's
  no more hot reload in this configuration.
- Keep `backend/.env` production secrets out of git and out of any shared logs/screenshots.
