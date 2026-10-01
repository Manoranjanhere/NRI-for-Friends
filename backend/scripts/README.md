# Backend scripts

Scripts read database settings from `backend/.env` (or from the environment when they run
inside the Docker `api` container, where `DB_HOST=postgres` is injected by docker-compose).

| Script | Use |
|--------|-----|
| `npm run db:ping` | Check the DB connection and list the latest migrations |
| `npm run seed:rourkela -- 20` | Insert 20 discover-ready users near Rourkela (override with `SEED_CITY`, `SEED_LAT`, `SEED_LNG`) |
| `npm run seed:test-users -- 12` | Insert 12 discover-ready users near Noida |
| `bash scripts/seed-via-docker.sh 20 20` | Run both seeds inside the API container on EC2 |

Migrations run automatically when the API starts (`DB_MIGRATIONS_RUN=true`). To run them by hand:

```bash
npm run migration:run
npm run migration:revert   # undo the last one (careful on production)
```

---

## Seeding on EC2

Postgres runs in Docker next to the API, so run seeds through the API container — Node does not
need to be installed on the host:

```bash
cd ~/nri-friends/backend
git pull
docker compose up -d --build
bash scripts/seed-via-docker.sh 20 20
```

Seeded users get full NRI Friends profiles (grew-up city, mother tongue, looking for, passions,
job profile, …), a placeholder photo, a location near the chosen city, a 30-day free trial and a
random "last active" time so the Recently online / New members lists have data.

## Connecting to the production DB from your laptop

Port 5432 is bound to `127.0.0.1` on the EC2 host. Open an SSH tunnel, then point `backend/.env`
at `localhost`:

```bash
ssh -i your-key.pem -L 5433:127.0.0.1:5432 ubuntu@YOUR_EC2_IP
# backend/.env: DB_HOST=localhost DB_PORT=5433 DB_PASSWORD=<same as server> NODE_ENV=production
npm run db:ping
```

## Safety

- When `NODE_ENV=production`, seed scripts refuse to run unless you pass `--confirm-prod`.
- Never commit `.env` files (they contain the DB password).
- Seeded users have no phone/login — they only appear in Discover and People lists.
