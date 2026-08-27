# TurboTrabajo

Job-application SaaS for the Chilean market, live at
[turbotrabajo.vercel.app](https://turbotrabajo.vercel.app). Candidates
register, complete a preference profile, and see job listings automatically
matched to it. Applying is one click and spends one token (packs are purchased
with [Flow.cl](https://www.flow.cl)); a human team then improves the
candidate's CV and submits each application on their behalf, and the candidate
tracks every application's status in-app through a full timeline.

## Features

- Email/password + Google sign-in (Firebase Auth), with a guided onboarding
  that captures regions, comunas, job categories, contract types, schedule and
  salary preferences, and skills
- Algorithmic job matching: hard filters (region, category, salary) plus soft
  ranking (comuna, contract type, schedule, skill keywords in the listing)
- Token wallet: signup trial grant, pack purchases via Flow.cl checkout,
  server-authoritative reserve → settle/release lifecycle with a full audit
  ledger per user
- One-click apply and "apply to all matches", both gated on token balance and
  an approved CV
- CV flow: PDF upload, human review, improved-version delivery, client
  approval or change requests, with version history
- Application pipeline: per-application status timeline (sent, interview,
  offer, rejected, withdrawn), withdraw action, and interview-prep Q&A per
  listing
- In-app notifications, dashboard stats, dark mode, fully responsive UI in
  Spanish

## Stack

- **Next.js 16** (App Router, TypeScript), deployed on **Vercel**
- **Firebase Auth** (email/password + Google)
- **Cloud Firestore** with security rules (`firestore.rules`) and composite
  indexes (`firestore.indexes.json`)
- **Firebase Storage** rules for CV PDFs (`storage.rules`)
- **Flow.cl** one-off Payment API for CLP token-pack purchases
- **Nodemailer** (Gmail App Password in production, Ethereal test inbox in dev)
  for CV intake email delivery
- **Tailwind CSS 4 + shadcn/ui**, **Vitest** for tests

## Architecture notes

- **Data model** (`src/lib/types.ts`, `src/lib/constants.ts` are the single
  source of truth): `users/{uid}` holds profile, wallet
  (`balance`/`reserved`), CV state, and a `tokenLedger` subcollection;
  `listings/{id}` holds the job postings plus a `prep` subcollection of
  interview Q&A; `applications/{id}` records status plus a `statusHistory`
  timeline; `payments/{id}` is an append-only log written by the Flow webhook.
- **Matching** (`src/lib/matching.ts`) runs client-side on dashboard load: one
  Firestore query by region + active, then hard filters (category, salary) and
  soft scoring in JS. Intentionally simple while the listings pool is small.
- **Token wallet** (`src/lib/wallet.ts`) is server-authoritative: clients can
  never write their own wallet (enforced by `firestore.rules`); applying goes
  through `/api/applications` which atomically reserves a token in a Firestore
  transaction, and every movement lands in the ledger.
- **Payments**: `/api/flow/create-order` signs and creates a Flow payment
  order; the webhook (`/api/flow/webhook`) does **not** trust the confirmation
  POST — it re-fetches payment status from Flow's `getStatus` endpoint before
  crediting tokens, since Flow does not sign the confirmation callback.
- **Auth on API routes** (`src/lib/firebase-token.ts`): Firebase ID tokens are
  verified with `jose` directly against Google's JWKS (signature, expiry,
  issuer, audience) — `firebase-admin/auth` cannot load on Vercel's bundler.
- **Security rules**: clients read/write only their own data; wallets, token
  ledger, listings, applications and payments are writable only via the Admin
  SDK (server routes / operator tooling). See `firestore.rules` and
  `storage.rules`.

## Quickstart

```bash
npm install
cp .env.example .env.local   # then fill in your own values — see Configuration
npm run dev                  # http://localhost:3000
```

Run the tests:

```bash
npm test
```

Optional — seed sample listings into your dev Firestore (requires the
`FIREBASE_ADMIN_*` vars):

```bash
npm run seed
```

Operator scripts (all require `FIREBASE_ADMIN_*` in `.env.local`):

```bash
npx tsx scripts/application-set-status.ts <applicationId> <status>  # status change + wallet side effects
npx tsx scripts/cv-mark-improved.ts <uid>                           # mark a CV as improved/awaiting review
npx tsx scripts/flow-smoke.ts                                       # verify Flow credentials (no money moves)
npx tsx scripts/cv-email-smoke.ts                                   # verify CV email delivery
```

## Configuration

Every value below is supplied by **you** and lives **only** in `.env.local`
locally and in your hosting provider's environment settings (e.g. Vercel →
Project → Settings → Environment Variables). **Never commit any of them** —
`.gitignore` already excludes `.env*` except `.env.example`, which must stay
names-only.

| Variable | What it is | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app key (public by design, restricted by Firebase security rules) | Firebase console → Project settings → General → Your apps → SDK setup |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (`<project>.firebaseapp.com`) | Same place |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id | Same place |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name | Same place |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender id | Same place |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app id | Same place |
| `FIREBASE_ADMIN_PROJECT_ID` | Project id for the Admin SDK (server only) | Firebase console → Project settings → Service accounts → Generate new private key (JSON: `project_id`) |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service-account email (server only) | Same JSON: `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service-account private key PEM (server only — **highly sensitive**) | Same JSON: `private_key` (keep the `\n` escapes) |
| `FLOW_API_KEY` | Flow.cl merchant API key | Flow dashboard → Mis Datos → API (sandbox: sandbox.flow.cl) |
| `FLOW_SECRET_KEY` | Flow.cl secret used to HMAC-sign every request (**highly sensitive**) | Same place |
| `FLOW_API_BASE_URL` | Flow environment: `https://sandbox.flow.cl/api` or `https://www.flow.cl/api` | Your choice of environment |
| `FLOW_PLAN_AMOUNT` | Price in CLP charged per checkout | Your pricing |
| `FLOW_PLAN_NAME` | Product name shown on the Flow checkout | Your product name |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the deployed app, used to build Flow confirmation/return URLs | Your deployment URL (e.g. `https://<your-app>.vercel.app`) |
| `GMAIL_USER` | Gmail address that sends CV intake emails (server only) | A Gmail account you control, with 2FA enabled |
| `GMAIL_APP_PASSWORD` | Gmail App Password for that account (**sensitive** — not the account password) | https://myaccount.google.com/apppasswords |
| `OWNER_CV_INBOX` | Inbox that receives uploaded CVs | Any email address you control |

Also set your own Firebase project id in `.firebaserc` (used by the `firebase`
CLI when deploying rules/indexes).

If `GMAIL_USER`/`GMAIL_APP_PASSWORD` are unset in development, CV emails fall
back to an [Ethereal](https://ethereal.email) test inbox and the app logs a
preview URL — no real credentials needed to develop locally.

## Deployment

The app deploys to **Vercel** as a standard Next.js project — set every
variable from the table above in the Vercel project's environment settings,
then:

```bash
npx vercel --prod
```

Firestore/Storage rules and indexes are deployed separately with the Firebase
CLI (after setting your project id in `.firebaserc`):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Point the Flow webhook at `https://<your-app>/api/flow/webhook` (the app also
passes `urlConfirmation` per order).

An `apphosting.yaml` is included for the alternative Firebase App Hosting
deploy path; Vercel is the primary target.

## Engineering highlights

A **production SaaS with real users and real payments** - 71 React components, 33 TypeScript
modules, ~24k lines, deployed on Vercel.

| | |
|---|---|
| **Languages** | TypeScript, React 19 |
| **Framework** | Next.js 16 App Router - route groups for `(auth)` / `(app)` / onboarding, server components, API route handlers, error boundaries |
| **Auth** | Firebase Auth (email/password + Google). Every API route verifies the ID token **server-side** and derives the acting user from the verified token - never from the request body. |
| **Data** | Cloud Firestore with hand-written **security rules**: default-deny, owner-scoped reads, field-level immutability so a client can never write their own `wallet` or `role`. |
| **Payments** | Flow.cl integration with **signature-verified webhooks**; token credits are looked up server-side by order id and applied idempotently, never taken from the callback payload. |
| **Server-authoritative state** | The token wallet is spent inside Firestore transactions; rate limiting lives in a server-only collection the client cannot reach. |
| **Testing / tooling** | Vitest (51 tests), ESLint, strict TS, Tailwind + shadcn/ui |

*Skills demonstrated: full-stack product engineering, authentication and authorization,
payment-gateway integration, database security rules, transactional integrity, file upload and
email pipelines, and shipping to production.*

## Disclaimer and terms of use

- **This is the source of a live service, published as a reference.** Running it yourself
  requires your own Firebase project, your own Flow.cl merchant account, and your own review of
  every security rule. Nothing here is a managed product, and no support is implied.
- **It handles other people's personal data.** CVs, names, emails, and job-application history
  are personal data under Chile's Ley 19.628 (and the GDPR if you serve EU users). If you
  deploy this, **you** become the data controller: publish a privacy notice, obtain consent,
  honour deletion requests, and review `firestore.rules` and `storage.rules` before going live.
  Do not seed it with real people's data while testing.
- **Payments.** `FLOW_API_BASE_URL` defaults to the Flow **sandbox**. Pointing it at production
  means handling real money under your own merchant agreement, and the webhook signature
  verification is your last line of defence — do not weaken it.
- **Trial tokens require a verified email**, deliberately: each token funds human work. If you
  change that rule, expect automated signup abuse.
- **Not legal, employment, or immigration advice.** Job matching is heuristic and human-assisted.
- **No warranty.** Provided "as is", without warranty of any kind (see [LICENSE](LICENSE)).

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Diego Ostertag.
