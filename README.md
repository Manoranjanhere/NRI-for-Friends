# NRI Friends 🧡

> **Find your people, wherever you are.** A friendship app for Non-Resident Indians — discover
> NRIs nearby, find people from your hometown, send an interest with an emoji, and make friends
> for festivals, weekend hangouts, sports, travel and language exchange.

React Native (Android-first) + NestJS + PostgreSQL. Orange and white theme.

---

## Table of contents

1. [Features](#features)
2. [Membership & pricing](#membership--pricing)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Local setup](#local-setup)
6. [Deployment](#deployment)
7. [Environment variables](#environment-variables)
8. [API reference](#api-reference)
9. [Database](#database)
10. [Push notifications](#push-notifications)
11. [Before publishing](#before-publishing)

---

## Features

### Profile

Created in two steps at sign-up and editable any time from **Profile → Edit profile**.

| Field | Notes |
|-------|-------|
| Name, age (18–80), gender | Required |
| Lives in — city, country | Required |
| Grew up in (hometown) | Required — powers the 🏡 *Same hometown* badge |
| Relationship status | Single, married, divorced, … |
| Looking for | Up to 3: friendship, hangouts, festivals & events, travel buddy, sports & fitness, language exchange |
| Wants to meet | Men, women or everyone |
| Mother tongue, religion | Picklists |
| Job profile, profession, education | Job profile required |
| Salary | Range in local currency (₹ LPA, $, £, €, …) with a **hide salary** switch |
| Height | cm / ft-in |
| Passions | Up to 5 tags (painting, dancing, cricket, yoga, …) |
| Bio, photos (up to 6), selfie verification | Photo verification gives a ✅ badge |

A **profile-completeness meter** on the Profile tab shows what to fill next.

### Discover

- **Nearby** swipe deck (distance, age, gender, looking for, mother tongue, religion,
  relationship status, country, grew-up city, photo-only and verified-only filters)
- **Recently online** (active in the last 3 days) and **New members** (joined in the last 30 days),
  both with the same filters plus "anywhere" distance
- Pagination on every list, online-now dot and "last seen" labels

### Connecting

- **Interests** — tap 😊 Smile, 🌹 Rose, ☕ Coffee or 🧸 Teddy on a profile. It lands in their
  inbox and the Interests tab. **Free for everyone, 5 per day.** Receivers can **accept** or
  **decline**; both sides see the status (waiting / accepted / declined) and a full history.
  If both people send each other an interest it is accepted automatically.
- **Connect (like)** — mutual likes make you **friends** and open a chat
- **Super like** and **compliment** (a message sent with a 💝)
- **Favorites** ⭐ — save profiles; see who favorited you
- **Profile visits** — see who viewed your profile and who you visited
- **Messages** — realtime chat (Socket.IO), unread badges
- **Block** (removes favorites and pending interests between you) and **report** (profile or photo)

### Tabs

| Tab | What's in it |
|-----|--------------|
| Feed | How-to-use guide cards with shortcuts (only shown when an admin turns it on) |
| Discover | Nearby swipe deck + filters (opens by default) |
| People | Recently online, new members, who liked you, friends, viewers, favorited you, my favorites, you liked, visited |
| Interests | Received / Sent / History |
| Messages | Inbox |
| Profile | Completeness, trial/membership status, invite friends (referral), edit profile, photos, verification, coins, settings |

### Other

- **Referral system** — share your code; you and the new member both get 10 coins
- **Coins** — daily login reward, Google Play coin packs; spent when daily limits run out
- **Trial reminders** — push at 5 days and 1 day before the free month ends
- **Hide profile**, delete account (anonymised), blocked-members list
- **Admin panel** — dashboard (members, trial vs paying, interests sent/accepted, reports),
  user search and actions (warn, ban, unban, remove photo), bans, reports, marketing push with
  filters (gender, age, country, city, grew-up city, mother tongue), audit logs
- **Feed** — "how to use the app" guide cards (content in `backend/src/feed/feed-content.ts`);
  admins switch it on/off from the admin dashboard (stored in the `app_settings` table).
  App news / new-profile posts can be added later.

---

## Membership & pricing

| | Free | Premium — ₹300 / month (same for everyone) |
|--|------|-----|
| Profile, discover, filters | ✅ | ✅ |
| Interests (5 per day), accept/decline | ✅ | ✅ |
| Favorites, who viewed / favorited you | ✅ | ✅ |
| Connect (like) | — | ✅ |
| Start new chats | — | 20 per day |
| Super likes / compliments | — | 5 / 5 per day |
| Replies in existing chats | — | Unlimited |

- Every new account gets **30 days of Premium free** — no card needed.
- Paying during the trial keeps the remaining trial days.
- Billing is through **Google Play** (`nrifriends_premium_1m`). Coin packs: `nrifriends_coins_1/5/10/25/50`.
- For local testing set `DISABLE_PAID_FEATURES=true` (also automatic when `NODE_ENV=development`).

---

## Tech stack

| Layer | Tech |
|-------|------|
| Mobile | React Native 0.79, TypeScript, React Navigation (native stack + bottom tabs), Zustand, MMKV, FastImage |
| Auth | Firebase phone OTP, Google, Apple |
| Backend | NestJS 10, TypeORM, class-validator, Socket.IO, @nestjs/schedule |
| Database | PostgreSQL 16 (Docker container on the EC2 host) |
| Storage | AWS S3 (photos), AWS Rekognition (selfie verification) |
| Payments | Google Play Billing (react-native-iap) |
| Push | Firebase Cloud Messaging |
| Email | Gmail via Nodemailer (admin alerts) |

---

## Project structure

```
NRI Friends/
├── backend/
│   ├── docker-compose.yml        # api + postgres
│   ├── deploy/                   # EC2 guide, nginx config, docker install script
│   ├── scripts/                  # seeds, db ping
│   └── src/
│       ├── admin/                # dashboard, users, reports, bans, marketing push, audits
│       ├── auth/                 # phone/social login, JWT (updates lastActiveAt)
│       ├── blocks/  reports/
│       ├── coins/                # balance, packs, daily reward, referral rewards
│       ├── discover/             # nearby, recently-online, new-users, filters
│       ├── likes/                # like, super like, compliment, friends, full profile
│       ├── messages/             # chat + Socket.IO gateway
│       ├── social/               # favorites, profile visits, interests
│       ├── subscriptions/        # plan, trial, Google Play verification
│       ├── tasks/                # crons: trial reminders, expiry, cleanup
│       ├── users/                # profile, photos, verification, profile-options.ts
│       └── migrations/
└── frontend/
    ├── nrifriends_app_icon.svg   # logo source (launcher PNGs are generated from it)
    └── src/
        ├── components/           # SwipeCard, ProfileCard, FiltersModal, ChipSelect, OptionPicker, notifications
        ├── constants/profileOptions.ts
        ├── navigation/           # root stack + MainTabs
        ├── screens/
        │   ├── auth/  onboarding/          # Welcome, phone OTP, Stage1 (also Edit profile), Stage2 photos
        │   ├── discover/                   # DiscoverScreen
        │   ├── people/                     # PeopleScreen, UserListScreen, InterestsScreen
        │   ├── profile/                    # MyProfileScreen, ProfileDetailScreen
        │   ├── messages/                   # Inbox, ChatConversation
        │   ├── subscription/               # Premium, Coins
        │   ├── settings/  verification/  admin/
        ├── services/  store/  utils/
```

---

## Local setup

### Backend

```bash
cd backend
cp .env.example .env          # DISABLE_PAID_FEATURES=true for local testing
docker compose up -d postgres # or use a local Postgres
npm install
npm run start:dev             # migrations run on start
npm run seed:rourkela -- 20   # optional demo users
```

API: `http://localhost:3000/api/v1` · Swagger: `http://localhost:3000/api/docs`

Tests: `npm test` · Type check: `npx tsc --noEmit`

### Mobile app

```bash
cd frontend
npm install
npm run android
```

Set the API URL in `frontend/src/config/api.config.ts`. Put your Firebase config at
`frontend/android/app/google-services.json` (registered for package **`com.nriconnectfriends.app`**).

Type check: `npx tsc --noEmit`

---

## Deployment

The API and PostgreSQL both run on one EC2 instance with `docker compose up -d --build`.
See **[backend/deploy/README.md](backend/deploy/README.md)** for the full guide (EC2, `.env`,
nginx + HTTPS on `nrifriends.sugarbf.club`, backups).

---

## Environment variables

See `backend/.env.example` (local) and `backend/.env.production.example` (server).

| Variable | Required | Notes |
|----------|----------|-------|
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Yes | `DB_HOST`/`DB_PORT` are set by docker-compose on the server |
| `DB_MIGRATIONS_RUN` | Yes | `true` — run migrations on start |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Yes | |
| `DISABLE_PAID_FEATURES` | Yes | `true` locally, `false` in production |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | Or `FIREBASE_PROJECT_ID` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | For Google login | |
| `APPLE_CLIENT_ID` | For Apple login | |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Yes | Photos + selfie verification |
| `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Prod | `com.nriconnectfriends.app` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Prod | Admin emails for new users / reports |

---

## API reference

All routes are prefixed with `/api/v1` and need a Bearer token unless noted.

| Area | Routes |
|------|--------|
| Auth | `POST /auth/phone/check` · `POST /auth/phone/verify` · `POST /auth/social` · `POST /auth/device/register` · `GET /auth/me` |
| Profile | `PATCH /users/profile/stage1` · `GET /users/profile/options` · `GET/POST/DELETE /users/profile/photos` · `PATCH /users/profile/photos/reorder` · `POST /users/verify/selfie` · `PATCH /users/profile/hide` · `/unhide` · `GET /users/referral-code` · `DELETE /users/account` |
| Discover | `GET /discover/nearby` · `GET /discover/recently-online` · `GET /discover/new-users` · `PATCH /discover/location` · `POST /discover/pass/:userId` |
| Likes | `POST /likes/:userId` · `POST /likes/:userId/super-like` · `POST /likes/:userId/compliment` · `GET /likes/you-liked` · `GET /likes/liked-by` · `GET /likes/matches` (friends) · `GET /likes/profile/:userId` (full profile + records a visit) |
| Favorites | `POST /favorites/:userId` (toggle) · `GET /favorites` · `GET /favorites/favorited-by` |
| Visits | `GET /visits/viewers` · `GET /visits/visited` |
| Interests | `POST /interests/:userId` `{type: smile\|rose\|coffee\|bear}` · `POST /interests/:id/accept` · `POST /interests/:id/reject` · `GET /interests/received` · `GET /interests/sent` · `GET /interests/history` · `GET /interests/received/pending-count` · `GET /interests/status/:userId` |
| Messages | `GET /messages/inbox` · `GET /messages/unread-count` · `GET/POST /messages/:userId` |
| Safety | `POST /blocks/:userId` (toggle) · `GET /blocks` · `POST /reports/:userId` |
| Membership | `GET /subscriptions/plans` · `GET /subscriptions/status` · `GET /subscriptions/feature-flags` · `POST /subscriptions/google-play/verify-subscription` |
| Coins | `GET /coins/balance` · `GET /coins/packs` · `POST /coins/daily-reward` · `POST /coins/google-play/verify` |
| Feed | `GET /feed` · `GET /feed/status` · admin: `GET/PATCH /admin/feed` `{ enabled }` |
| Public | `GET /privacy` · `GET /terms` · `GET /support` (no auth) |
| Admin | `GET /admin/dashboard` · `/admin/users` · `/admin/reports` · `/admin/bans` · `POST /admin/notifications/push` · `/admin/audits/*` |

List endpoints accept `page` and `limit` and return `{ users | items, total, page, limit, pages }`.

---

## Database

Main tables: `users`, `user_photos`, `likes`, `passes`, `favorites`, `profile_visits`,
`interests`, `messages`, `blocks`, `reports`, `subscriptions`, `coin_transactions`, `devices`,
`banned_identities`, audit tables.

Schema changes are hand-written TypeORM migrations in `backend/src/migrations/`
(`synchronize` is off).

---

## Push notifications

| Type | Sent when | App opens |
|------|-----------|-----------|
| `interest` | Someone sends you 😊🌹☕🧸 | Interests tab |
| `interest_accepted` | Your interest was accepted | Chat |
| `like` / `super_like` | Someone wants to connect | Who liked you |
| `match` | You're now friends | Chat |
| `message` / `compliment` | New message | Chat |
| `favorite` | Someone favorited you | Their profile |
| `trial_reminder` | 5 days and 1 day before the trial ends | Premium screen |
| `warning` / `banned` / `photo_removed` / `marketing` | Admin actions | — |

---

## Before publishing

1. Register **`com.nriconnectfriends.app`** in Firebase (add your SHA-1/SHA-256), download the new
   `google-services.json` and update the client IDs in `frontend/src/config/google.config.ts`.
2. Create the Play Console app, the subscription `nrifriends_premium_1m` (₹300/month) and the
   coin products `nrifriends_coins_1`, `_5`, `_10`, `_25`, `_50`.
3. Point `nrifriends.sugarbf.club` (or your domain) at the EC2 Elastic IP and update
   `frontend/src/config/api.config.ts` if you use a different domain.
4. Create a new upload keystore (`frontend/android/keystore.properties`, see the `.example`).
