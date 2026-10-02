# Deploying NRI Friends on EC2 (API + Postgres with Docker Compose)

Everything runs on one EC2 instance: the NestJS API and PostgreSQL 16 are two containers
started by `docker compose up`. No RDS/Aurora is needed.

## Architecture

- **EC2** (Ubuntu 22.04, `t3.small` or larger) with Docker
- **`api` container** — NestJS on port 3000, runs DB migrations on start
- **`postgres` container** — data in the `pgdata` Docker volume (survives rebuilds);
  bound to `127.0.0.1:5432` only
- **nginx + Let's Encrypt** — HTTPS on `nrifriends.sugarbf.club` → `127.0.0.1:3000`
- **S3** — profile photos; **Firebase** — phone OTP + push

Region suggestion: `ap-south-1` (Mumbai).

---

## 1. EC2 instance

1. Launch Ubuntu 22.04, attach an Elastic IP.
2. Security group inbound:

   | Port | Source | Why |
   |------|--------|-----|
   | 22 | your IP | SSH |
   | 80 | 0.0.0.0/0 | HTTP (certbot + redirect) |
   | 443 | 0.0.0.0/0 | HTTPS API |
   | 3000 | your IP (temporary) | testing before nginx is set up |

   **Never open 5432.** Use an SSH tunnel to reach the database (see `scripts/README.md`).

3. Install Docker:

   ```bash
   ssh -i your-key.pem ubuntu@YOUR_EC2_IP
   sudo bash deploy/ec2-install-docker.sh   # or: curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu            # log out and back in
   ```

---

## 2. Deploy the API + database

```bash
git clone https://github.com/YOUR_ORG/nri-friends.git
cd nri-friends/backend
cp .env.production.example .env
nano .env
```

Set at least:

- `DB_PASSWORD` — long random string (Postgres is created with it on first start)
- `JWT_SECRET` — long random string
- `FIREBASE_SERVICE_ACCOUNT_JSON` (or `FIREBASE_PROJECT_ID` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- `GOOGLE_PLAY_PACKAGE_NAME=com.nriconnectfriends.app`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` (admin alerts)
- `DISABLE_PAID_FEATURES=false` for real billing

Do **not** set `DB_HOST` — docker-compose points the API at the `postgres` container.

Start everything:

```bash
docker compose up -d --build
docker compose logs -f api
```

You should see `[Firebase] Admin SDK ready` and `NRI Friends API running`. Migrations create the
full schema on the first start.

Test:

```bash
curl http://YOUR_EC2_IP:3000/api/v1/auth/phone/check \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

Optional demo data: `bash scripts/seed-via-docker.sh 20 20`.

---

## 3. HTTPS + domain (`nrifriends.sugarbf.club`)

### DNS

Create an **A record** `nrifriends` (on sugarbf.club) → your EC2 Elastic IP.

### nginx + certificate

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

sudo cp ~/nri-friends/backend/deploy/nginx-nrifriends.sugarbf.club.conf \
  /etc/nginx/sites-available/nrifriends.sugarbf.club
sudo ln -sf /etc/nginx/sites-available/nrifriends.sugarbf.club /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d nrifriends.sugarbf.club
```

Then remove the public 3000 rule from the security group.

### Verify

```bash
curl -i https://nrifriends.sugarbf.club/api/v1/privacy
```

---

## 4. Point the mobile app at the server

`frontend/src/config/api.config.ts`:

```ts
export const DEV_API_BASE_URL = 'https://nrifriends.sugarbf.club/api/v1';
export const PROD_API_BASE_URL = 'https://nrifriends.sugarbf.club/api/v1';
```

Before DNS/SSL is ready you can temporarily use `http://YOUR_EC2_IP:3000/api/v1` for dev builds
(Android release builds block plain HTTP).

---

## 5. Updates

```bash
cd ~/nri-friends/backend
git pull
docker compose up -d --build
```

New migrations run automatically (`DB_MIGRATIONS_RUN=true`).

## 6. Backups

```bash
# dump
docker compose exec -T postgres pg_dump -U postgres nri_friends | gzip > nri_friends_$(date +%F).sql.gz
# restore into an empty database
gunzip -c nri_friends_2026-01-01.sql.gz | docker compose exec -T postgres psql -U postgres nri_friends
```

Schedule the dump with cron and copy it to S3 (`aws s3 cp …`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DB_PASSWORD must be set` | Add `DB_PASSWORD` to `backend/.env` |
| API can't connect to DB | `docker compose ps` — postgres must be `healthy`; don't set `DB_HOST` in `.env` |
| Changed `DB_PASSWORD` after first start | Postgres keeps the original password in the volume; change it with `ALTER USER` or recreate the volume (data loss) |
| Firebase error on verify | Same `FIREBASE_*` values as local in the server `.env` |
| HTTP blocked on Android release | Use HTTPS (nginx + certbot) |
