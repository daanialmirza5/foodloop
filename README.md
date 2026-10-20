# FoodLoop

**Rescue Food. Share Hope. Feed Communities.**

FoodLoop is a full-stack food donation and rescue platform. It connects people and organisations with surplus food — restaurants, caterers, bakeries, weddings and other events — with verified NGOs, shelters and community kitchens, and with volunteers who collect and deliver the food. It also supports planned fresh-food donations, meal sponsorship and (simulated or sandbox) monetary contributions, with an impact dashboard computed from confirmed records.

> **Demo mode is on by default.** All demo organisations, people, donations and payments are fictional and labelled **DEMO**. Payments are simulated: **no real money is transferred.**

---

## Contents
1. [Features](#features)
2. [Technology](#technology)
3. [Quick start](#quick-start)
4. [Demo accounts & presentation](#demo-accounts--presentation)
5. [Environment variables](#environment-variables)
6. [Database](#database)
7. [Commands](#commands)
8. [Payments (Razorpay sandbox)](#payments-razorpay-sandbox)
9. [Architecture](#architecture)
10. [Security & privacy](#security--privacy)
11. [Food safety model](#food-safety-model)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)
15. [Known limitations](#known-limitations)

---

## Features

| Area | What works |
|---|---|
| **Accounts** | Registration (donor, NGO, volunteer, supporter), sign-in/out, 7-day sessions, password reset (link shown on screen in demo mode because email isn't configured), role-based dashboards. Admin can never be self-assigned. |
| **Food donations** | Full listing form (category, quantity + kg, preparation/expiry, storage & temperature, packaging, allergens, food type, pickup window & deadline, contact, photo, instructions). Three sources: everyday surplus, planned fresh donation, registered event. Drafts, edits (re-screened), cancellation. Unique tracking ID (`FL-YYYY-NNNN`) and full status history. |
| **Safety** | Automated pre-screening → mandatory coordinator review → pickup checklist → recipient acknowledgement. Unsafe food rejected with reasons. High-severity incident = safety hold that blocks distribution. |
| **Wedding & event rescue** | Event registration (all requested fields), submit → coordinator confirmation, “Donate Leftover Food Now” linked to the event, urgent rescue form, event status derived from linked food, event dashboard (estimate vs offered/accepted/collected/delivered), CSV export, partner (venue/caterer) applications. |
| **Matching** | Verified-only recipients; distance vs service radius, travel time vs deadline, remaining daily capacity, veg-only preference, cold-storage needs, transport. Ineligible matches show reasons; “no recipient available” is reported, never hidden. |
| **NGO portal** | Organisation profile, verification documents (private), browse/search, request with collection method, withdraw, confirm or refuse deliveries, record self-collection, food requirements, history, incident reporting. |
| **Volunteers** | Profile, open tasks (address hidden until claimed), atomic claim (no double assignment), release, pickup checklist, handover with minutes, missed-pickup reporting, hours & kg stats. |
| **Logistics / admin** | Overview, moderation queue, NGO verification with reasons, user suspension, event confirmation, logistics dashboard (pending/urgent/delayed/failed), volunteer assignment & transport partner, re-arrange or close failed collections, incidents, payments & refunds, disbursement ledger, partner agreements, audit log, settings (safety thresholds), CSV exports. |
| **Money** | Programmes with clearly-labelled *illustrative* costs, suggested & custom INR amounts, one-time or monthly pledge, simulated checkout with prominent banner, receipts with verification trail, Razorpay order + signature + server re-fetch + signed webhooks when keys are set, idempotent processing, refunds, disbursement tracking. |
| **Notifications** | In-app notifications with unread badge, timestamps and deep links for every major event. |
| **Impact** | Offered / accepted / collected / delivered kept separate; delivered = recipient-confirmed only (one row per donation, so never double counted). Monthly chart, source & category breakdown, event metrics, rejections & reasons, volunteer hours, money (provider-confirmed vs simulated vs refunded vs disbursed), labelled meal estimate, date filters, demo/real toggle, CSV export. |

### Pages
Public: `/`, `/events`, `/events/partners`, `/discover`, `/discover/[id]`, `/donate`, `/fresh`, `/donate-money`, `/donate-money/checkout/[id]`, `/donate-money/receipt/[id]`, `/find-support`, `/how-it-works`, `/impact`, `/about`, `/food-safety`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/demo`.

Dashboard (role-aware): overview, listings (+new/edit/detail), events (+new/urgent/detail/edit), requests, collections, history, impact, contributions, incidents, organisation, deliveries, needs, tasks, assignments, volunteer profile, notifications, profile.

Admin: overview, listings, events, logistics, requests, organisations, users, incidents, payments, partners, reports, audit, settings.

---

## Technology

- **Next.js 15 (App Router)**, React 19, TypeScript, Server Actions
- **Tailwind CSS 4**, Lucide icons, Plus Jakarta Sans + Fraunces
- **Zod** validation (server-side; the server is the source of truth)
- **Node’s built-in SQLite** (`node:sqlite`) — a real relational database with foreign keys, CHECK constraints, partial unique indexes and transactions; no native build step
- **Recharts** charts, **Leaflet + OpenStreetMap** maps
- **Razorpay** (optional, sandbox supported)
- **Vitest** unit/integration tests
- A PostgreSQL/Supabase schema with Row Level Security is included for production migration (see [limitations](#known-limitations))

> Why SQLite instead of Supabase? The brief requires the app to run without any external credentials. SQLite gives a persistent relational database out of the box. React Hook Form was not used: forms post to Server Actions with Zod validation and show per-field errors returned from the server.

---

## Quick start

**Prerequisites:** Node.js **22.13 or newer** (`node --version`). Tested on Node 22.23 / Windows 11.

```bash
npm install            # .npmrc sets legacy-peer-deps (works around an npm resolver bug)
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run setup          # creates ./data/foodloop.db and loads demo data
npm run dev            # http://localhost:3000
```

For a faster, production-like demo:

```bash
npm run build
npm start              # http://localhost:3000
```

You will see `ExperimentalWarning: SQLite is an experimental feature` in the terminal — that is expected on Node 22 and harmless.

---

## Demo accounts & presentation

Open **http://localhost:3000/demo** for one-click sign-in. Password for every account: **`Demo@1234`**.

| Email | Role |
|---|---|
| admin@foodloop.demo | Administrator / coordinator |
| restaurant@foodloop.demo | Donor — Spice Route Kitchen |
| wedding@foodloop.demo | Donor — wedding organiser |
| bakery@foodloop.demo | Donor — Golden Crust Bakery |
| ngo@foodloop.demo | NGO — Annapurna Community Kitchen (verified) |
| shelter@foodloop.demo | NGO — Hope Shelter Trust (verified, veg only) |
| newngo@foodloop.demo | NGO — New Dawn Children’s Home (pending) |
| volunteer@foodloop.demo / volunteer2@foodloop.demo | Volunteers |
| supporter@foodloop.demo | Individual supporter |

**Reset before presenting.** Open listings are created with deadlines relative to the moment of seeding (a few hours), so run `npm run db:reset` (or use “Reset demo data” on `/demo`) shortly before your demo. Reset wipes the whole local database.

The `/demo` page lists the five scripted scenarios (A–E).

### Creating a real administrator
```bash
npm run create-admin -- you@example.org "Your Name" "AStrongPassw0rd"
```
Existing admins can also create admins under **Admin → Users**. Public registration can never create one.

---

## Environment variables

See `.env.example` (placeholders only).

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Public base URL |
| `DEMO_MODE` | `true` | Enables `/demo`, one-click demo login, demo reset. **Set `false` for any public deployment.** |
| `DATABASE_FILE` | `./data/foodloop.db` | SQLite file |
| `UPLOAD_DIR` | `./storage` | Food photos and private verification documents (outside `public/`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | empty | Empty → simulated payments. `rzp_test_…` → sandbox. |
| `RAZORPAY_WEBHOOK_SECRET` | empty | Required to accept webhooks |

---

## Database

The schema lives in `src/lib/db/schema.ts` and is applied automatically on first connection (`npm run db:migrate` applies it explicitly). Main tables:

`users`, `sessions`, `password_resets`, `organizations` (donor & recipient), `verification_requests`, `volunteer_profiles`, `events`, `partner_applications`, `food_listings`, `safety_screenings`, `food_needs`, `donation_requests`, `collections`, `delivery_confirmations`, `meal_programs`, `monetary_donations`, `payment_transactions`, `refunds`, `disbursements`, `notifications`, `incidents`, `status_history`, `audit_logs`, `settings`.

Integrity rules enforced by the database itself:
- one open request per organisation per listing; one accepted request per listing (partial unique indexes)
- one active collection per listing → no duplicate volunteer assignments
- `delivery_confirmations.listing_id` UNIQUE → delivered food can never be counted twice
- `payment_transactions.provider_event_id` UNIQUE → each provider event is processed once
- CHECK constraints on statuses, roles and positive quantities; foreign keys everywhere

Roles and permissions are defined in `src/lib/permissions.ts` and checked by every service function.

Seed data: `src/lib/seed.ts` (`npm run db:seed` / `npm run db:reset`).

PostgreSQL/Supabase version with RLS policies, state-transition triggers and admin-escalation guards: `supabase/migrations/0001_foodloop.sql`.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Vitest suite |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply schema |
| `npm run db:seed` / `npm run db:reset` | Load / reload demo data (reset wipes all data) |
| `npm run create-admin -- email "Name" "password"` | Create an administrator |

---

## Payments (Razorpay sandbox)

Without keys, FoodLoop uses a simulated checkout that shows **“DEMO MODE — NO REAL MONEY IS TRANSFERRED.”** and lets you choose success/failure/cancel. Records are marked `simulated` everywhere.

To use the Razorpay sandbox:
1. Create a Razorpay account and switch to **Test Mode**; copy the test Key ID and Secret.
2. Set `RAZORPAY_KEY_ID=rzp_test_…` and `RAZORPAY_KEY_SECRET=…` in `.env.local`, restart.
3. Add a webhook in the Razorpay dashboard → URL `https://<your-host>/api/payments/razorpay/webhook`, events `payment.captured`, `payment.failed`, `refund.processed`, and set the same secret as `RAZORPAY_WEBHOOK_SECRET`. (Webhooks need a public URL; use a tunnel such as `ngrok` locally.)

How a payment is confirmed: server creates the order → Razorpay Checkout collects payment details (FoodLoop never sees card/UPI/bank data) → browser posts the result to `/api/payments/razorpay/verify` → server checks the HMAC signature **and** re-fetches the payment from Razorpay (amount + order must match) → or a signed webhook confirms it. A browser redirect alone never marks a payment successful. Status changes follow `created → pending → succeeded|failed|cancelled`, `succeeded → refunded`; anything else is rejected.

> The Razorpay sandbox path is implemented and its signature logic is unit-tested, but it was **not exercised against Razorpay’s servers** in this build (no test keys were available).

Before accepting real donations you need, at minimum: a legally registered organisation (trust/society/Section 8 company), a bank account in its name, KYC with the payment provider, accounting and receipting processes, and legal advice on applicable law (including any FCRA, income-tax and data-protection obligations). FoodLoop makes no tax-benefit claims.

---

## Architecture

```
src/
  app/                 routes (public pages, /dashboard/*, /admin/*, /api/*)
  components/          UI (server components + small client components)
  lib/
    db/                SQLite connection, schema
    services/          business logic: listings, logistics, events, organizations,
                       payments, incidents, impact, notifications, audit, users, needs
    actions/           server actions (thin: parse → call service → revalidate)
    safety.ts          automated screening rules
    matching.ts        recipient eligibility & scoring
    workflow.ts        state machines (listing, event, payment)
    permissions.ts     role → permission matrix
    validation.ts      Zod schemas
tests/                 Vitest tests against a fresh temp database
supabase/migrations/   PostgreSQL + RLS schema
```

All business rules live in `lib/services`, which take an `actor` and enforce permissions and state transitions themselves. Pages and actions never write to the database directly. This keeps the rules testable without a browser and identical whichever page triggers them.

**Main workflow:** donor lists food → automated screening → coordinator approval (`available`) → verified NGO requests (`request_received`) → donor/coordinator accepts (`accepted`, collection created) → volunteer claims or coordinator assigns (`pickup_scheduled`) → pickup with checklist (`collected`) → handover → NGO confirms quantity (`delivered`, impact recorded). Failure paths: rejected, cancelled, expired (deadline passes), missed pickup → re-arrange or close.

**Event workflow:** registered → awaiting confirmation → awaiting food → ready for collection → collection arranged → completed (or cancelled). The last four are derived from the event's linked food, so registration alone never makes food “available”.

---

## Security & privacy

- Passwords: salted **scrypt**; sessions: 256-bit random tokens stored as SHA-256 hashes, HTTP-only `SameSite=Lax` cookies (`Secure` in production), 7-day expiry, revoked on suspension or password reset.
- Authorization on the server for every page, action and API route; middleware only gives a fast redirect. Verified by an HTTP check that guests, wrong roles and other organisations are redirected/denied.
- Public sign-up cannot create administrators; admins only via CLI or by an existing admin.
- Sensitive admin actions require a reason and are written to an append-only audit log.
- Exact pickup addresses and contact numbers are redacted for anyone except the donor, the accepted recipient, the assigned volunteer and admins; maps show only an approximate ~1 km area.
- Uploads: size limits, type detected from file content (magic bytes), random file names, stored outside `public/`; verification documents served only to their owner and admins.
- Rate limiting on sign-in, registration, password reset, listing, request, donation and demo-reset actions (in-memory, per process).
- CSV exports escape formula-injection characters.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- No beneficiary personal data is collected; NGOs report only approximate counts.
- Privacy policy and terms are **placeholders that need legal review** (e.g. against India's DPDP Act, 2023).

---

## Food safety model

Thresholds (admin-configurable, never less strict than these minimums): hot-held ≥ 60 °C and ≤ 6 h from preparation to deadline; refrigerated ≤ 5 °C and ≤ 24 h; cooked food at room temperature ≤ 2 h; packaged goods must not expire before the deadline; plated/partially eaten, uncovered or unknown-storage ready-to-eat food is rejected; allergens must be declared. These are FoodLoop operating rules based on widely published principles (e.g. WHO “Five Keys to Safer Food”) — **not a statement of Indian law**. Participants should follow FSSAI guidance (fssai.gov.in). FoodLoop coordinates donations and does not replace safe handling, licensing or legal compliance, and provides no legal protection to donors.

---

## Testing

```bash
npm test
```

28 Vitest tests run against a fresh temporary database seeded with demo data:
- Scenario A full lifecycle with exact impact deltas and a duplicate-confirmation (no double count) check
- Scenario B wedding flow: estimates not counted, event status progression, event impact
- listings never auto-published; invalid/unsafe listings rejected (time at room temperature, not-served declaration, missing expiry)
- authorization: NGOs can't approve, pending NGOs can't request, donors can't decide others' requests or cancel others' listings, completed donations immutable, duplicate volunteer claim blocked
- capacity and veg-only blocking; “no eligible recipient” reported
- pickup-check failure, refusal on arrival, safety hold & release, admin unsafe rejection, expired listings
- missed pickup → re-arrange → reassign
- event cancellation cascades; organisers can't attach food to other people's events
- auth: password hashing, admin self-registration blocked, suspended sessions revoked
- NGO verification admin-only with reason + audit entry
- payments: simulated labelling, exactly-once processing, invalid transitions rejected, guest token required, checkout & webhook HMAC verification, browser data alone can't confirm
- safety rules and upload type sniffing

Additionally verified during development (scripts not shipped in the repo): an HTTP smoke test of every route as 8 different roles (736 requests, 0 server errors), an HTTP authorization check (12/12), and a headless-browser run (Microsoft Edge) of Scenarios A, B, D, E, unsafe-food rejection and mobile navigation through the real UI.

---

## Deployment

FoodLoop needs a **persistent disk** (SQLite file + uploads) and Node 22.13+. It will **not** work on serverless hosts with ephemeral file systems (e.g. Vercel) without first moving to Postgres/Supabase.

Example on a VM / Render / Railway / Fly.io with a mounted volume:
```bash
npm ci
npm run build
DEMO_MODE=false DATABASE_FILE=/data/foodloop.db UPLOAD_DIR=/data/storage npm start
npm run create-admin -- admin@yourorg.org "Admin" "StrongPass123"
```
Put it behind HTTPS, back up `/data` regularly, and run a single instance (rate limiting and SQLite locking are per-process).

Deployment was **not** performed as part of this build.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm error Cannot read properties of null (reading 'edgesOut')` | npm resolver bug — the included `.npmrc` (`legacy-peer-deps=true`) avoids it. |
| `process.getBuiltinModule is not a function` / `node:sqlite` not found | Upgrade Node to 22.13+. |
| All listings show “Expired” | Deadlines are relative to seeding time — run `npm run db:reset`. |
| Demo sign-in says “Unknown demo account” | Load demo data: `npm run setup`. |
| `database is locked` | Stop other processes using the DB file (e.g. a second `npm run dev`). |
| Maps blank | OpenStreetMap tiles need internet; everything else works offline. Fonts are downloaded at build time. |

---

## Known limitations

- **Supabase is not wired in.** The app runs on SQLite. `supabase/migrations/0001_foodloop.sql` is the target production schema with RLS, but it was **not executed against PostgreSQL** in this build, and there is no Supabase data/auth adapter yet.
- **Email / WhatsApp notifications are not implemented**; in-app notifications only. Password-reset links are shown on screen in demo mode.
- **Razorpay sandbox untested live** (no keys); recurring donations are recorded as monthly pledges without automatic renewal (Razorpay Subscriptions not integrated).
- A request is for a whole listing; splitting one listing between several NGOs isn't supported.
- Distance uses straight-line distance and an assumed 20 km/h city speed — not road routing. Matching needs coordinates (or the same city name).
- Single-process design: in-memory rate limiting; SQLite suits one server instance.
- Stock photos (Unsplash, bundled locally) are used when donors don't upload one.
- Data retention periods, the privacy policy and terms need legal review; FoodLoop is not a registered charity and does not hold FSSAI registration.
- Food-safety thresholds are operating rules, not legal standards.
