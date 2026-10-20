<div align="center">

<img src="src/app/icon.svg" width="72" alt="FoodLoop logo" />

# FoodLoop

### Rescue Food. Share Hope. Feed Communities.

*Every meal deserves a chance to make a difference.*

A full-stack food donation & rescue platform that connects surplus food from restaurants, caterers, weddings and events with verified NGOs, shelters and community kitchens — collected by volunteers, safety-screened at every step, and tracked until the recipient confirms delivery.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite-003b57?logo=sqlite&logoColor=white)
![Tests](https://img.shields.io/badge/tests-28%20passing-2f7a52)

<img src="docs/screenshots/home.png" alt="FoodLoop home page" width="100%" />

</div>

> [!IMPORTANT]
> **This project runs in demonstration mode by default.** Every organisation, person, donation and payment in the demo data is **fictional** and labelled **DEMO**. Payments are simulated — **no real money is transferred.**

---

## 📑 Table of contents

1. [What FoodLoop does](#-what-foodloop-does)
2. [Screenshots](#-screenshots)
3. [How to run it (step by step)](#-how-to-run-it-step-by-step)
4. [Demo accounts](#-demo-accounts)
5. [How to use FoodLoop — guide for every role](#-how-to-use-foodloop--guide-for-every-role)
6. [Presentation script (5 scenarios)](#-presentation-script-5-scenarios)
7. [Features in detail](#-features-in-detail)
8. [Technology stack](#-technology-stack)
9. [Project structure & architecture](#-project-structure--architecture)
10. [Database](#-database)
11. [Food-safety model](#-food-safety-model)
12. [Payments & the Razorpay sandbox](#-payments--the-razorpay-sandbox)
13. [Security & privacy](#-security--privacy)
14. [Testing](#-testing)
15. [All commands](#-all-commands)
16. [Environment variables](#-environment-variables)
17. [Deployment](#-deployment)
18. [Troubleshooting](#-troubleshooting)
19. [Known limitations](#-known-limitations)

---

## 🌱 What FoodLoop does

Good food is thrown away every day after weddings, parties and restaurant service — while shelters and community kitchens nearby work hard to feed people. The gap is **coordination, timing and trust**. FoodLoop closes it with one connected workflow:

```
 Donor lists food ──► Automated safety screening ──► Coordinator approval ──► Verified NGO requests
        ▲                                                                            │
        │                                                                            ▼
 Impact dashboard ◄── NGO confirms kg received ◄── Volunteer picks up & delivers ◄── Donor accepts
```

| Who | What they do on FoodLoop |
|---|---|
| 🍛 **Food donors** — restaurants, hotels, caterers, bakeries, canteens, families | List surplus or fresh food, register weddings & events, accept requests, track deliveries |
| 💒 **Event organisers** | Register a wedding in advance, then donate the *actual* leftovers after the event, or request an urgent rescue |
| 🏠 **NGOs / shelters / community kitchens** | Get verified, browse food, request what they can safely store and serve, confirm deliveries |
| 🛵 **Volunteers** | Claim nearby pickups, run a safety checklist, deliver, log their hours |
| 💚 **Supporters** | Sponsor meal programmes (simulated payments in demo mode) |
| 🛡️ **Administrators** | Verify NGOs, approve food after safety review, assign volunteers, handle incidents, review finances and audit logs |

---

## 📸 Screenshots

### Public website

| Home | Wedding & Event Food Rescue |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Event Food Rescue](docs/screenshots/event-rescue.png) |
| **Discover Food** (search, filters, grid/list) | **Food listing detail** (safety screening, map, request) |
| ![Discover](docs/screenshots/discover.png) | ![Listing detail](docs/screenshots/listing-detail.png) |
| **Donate Money** (programmes, demo banner) | **Food-safety rules** |
| ![Donate money](docs/screenshots/donate-money.png) | ![Food safety](docs/screenshots/food-safety.png) |

<details>
<summary><b>Full home page (click to expand)</b></summary>

![Full home page](docs/screenshots/home-full.png)
</details>

### Impact dashboard

<details open>
<summary><b>Impact computed live from confirmed records</b></summary>

![Impact dashboard](docs/screenshots/impact.png)
</details>

### Donors & event organisers

| Donor dashboard | Add a food donation |
|---|---|
| ![Donor dashboard](docs/screenshots/donor-dashboard.png) | ![Listing form](docs/screenshots/listing-form.png) |
| **My Events** | **Event dashboard** — estimate vs actual food |
| ![My events](docs/screenshots/my-events.png) | ![Event dashboard](docs/screenshots/event-dashboard.png) |
| **Urgent event rescue** | **Incoming requests** |
| ![Urgent rescue](docs/screenshots/urgent-rescue.png) | ![Incoming requests](docs/screenshots/incoming-requests.png) |

### NGOs & volunteers

| NGO dashboard | Volunteer — available tasks |
|---|---|
| ![NGO dashboard](docs/screenshots/ngo-dashboard.png) | ![Volunteer tasks](docs/screenshots/volunteer-tasks.png) |
| **Volunteer — assignment with pickup checklist** | |
| ![Volunteer assignment](docs/screenshots/volunteer-assignment.png) | |

### Administrator

| Platform overview | Listing moderation |
|---|---|
| ![Admin overview](docs/screenshots/admin-overview.png) | ![Moderation](docs/screenshots/admin-moderation.png) |
| **Coordinator safety review** | **NGO verification** |
| ![Admin review](docs/screenshots/admin-review.png) | ![Verification](docs/screenshots/admin-verification.png) |
| **Logistics** | **Safety incidents** |
| ![Logistics](docs/screenshots/admin-logistics.png) | ![Incidents](docs/screenshots/admin-incidents.png) |
| **Payments & funds** | **Audit log** |
| ![Payments](docs/screenshots/admin-payments.png) | ![Audit log](docs/screenshots/admin-audit.png) |

### Simulated payment flow

| Demo checkout | Transaction record |
|---|---|
| ![Checkout](docs/screenshots/demo-checkout.png) | ![Receipt](docs/screenshots/receipt.png) |

### Mobile

| Home | Menu | Discover |
|---|---|---|
| <img src="docs/screenshots/mobile-home.png" width="260" /> | <img src="docs/screenshots/mobile-menu.png" width="260" /> | <img src="docs/screenshots/mobile-discover.png" width="260" /> |

### Demo access page

![Demo access](docs/screenshots/demo-access.png)

---

## 🚀 How to run it (step by step)

### 1. Install the prerequisites

| Tool | Version | How to check | Download |
|---|---|---|---|
| **Node.js** | **22.13 or newer** (22 LTS or 24 recommended) | `node --version` | https://nodejs.org |
| **Git** | any recent | `git --version` | https://git-scm.com |

> No database server, Docker, Supabase account or payment keys are needed. The database is a file that is created automatically.

### 2. Get the code

```bash
git clone https://github.com/daanialmirza5/foodloop.git
cd foodloop
```

### 3. Install dependencies

```bash
npm install
```

> The repository includes an `.npmrc` with `legacy-peer-deps=true`, which avoids an npm bug (`Cannot read properties of null (reading 'edgesOut')`).

### 4. Create your environment file

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```
**macOS / Linux:**
```bash
cp .env.example .env.local
```
The defaults work as-is. See [Environment variables](#-environment-variables) for options.

### 5. Create the database and load demo data

```bash
npm run setup
```
This creates `data/foodloop.db` and loads fictional demo accounts, NGOs, events, donations, deliveries and simulated payments. It prints the list of demo accounts.

### 6. Start the app

**Development mode** (auto-reload while editing):
```bash
npm run dev
```

**Production mode** (faster — recommended for presenting):
```bash
npm run build
npm start
```

Open **http://localhost:3000** 🎉

> You will see `ExperimentalWarning: SQLite is an experimental feature` in the terminal. That is normal for Node 22 and harmless.

### 7. Sign in

Go to **http://localhost:3000/demo** and click **Sign in** next to any demo account — or use the [credentials below](#-demo-accounts).

### 8. Before every presentation: reset the demo

```bash
npm run db:reset
```
Open demo listings have pickup deadlines a few hours after seeding, so reset shortly before you present. (You can also click **Reset demo data** on `/demo`.) ⚠️ Reset wipes **all** local data, including anything you created.

### 9. Run the tests (optional)

```bash
npm test
```

---

## 🔑 Demo accounts

Password for **every** account: **`Demo@1234`** — or use one-click sign-in at **`/demo`**.

| Email | Role | Use it to… |
|---|---|---|
| `admin@foodloop.demo` | 🛡️ Administrator / coordinator | approve food, verify NGOs, assign volunteers, review incidents & payments |
| `restaurant@foodloop.demo` | 🍛 Donor — Spice Route Kitchen | list everyday surplus, accept requests |
| `wedding@foodloop.demo` | 💒 Donor — wedding organiser | register events, donate leftovers, urgent rescue |
| `bakery@foodloop.demo` | 🥖 Donor — Golden Crust Bakery | fresh-food donation with a pending request |
| `ngo@foodloop.demo` | 🏠 NGO — Annapurna Community Kitchen (verified) | request food, confirm deliveries |
| `shelter@foodloop.demo` | 🏠 NGO — Hope Shelter Trust (verified, veg only) | show diet & capacity matching |
| `newngo@foodloop.demo` | 🏠 NGO — New Dawn Children's Home (**pending**) | show that unverified NGOs can't request |
| `volunteer@foodloop.demo` | 🛵 Volunteer — Arjun | claim tasks, pickups, deliveries |
| `volunteer2@foodloop.demo` | 🛵 Volunteer — Sana | already has an active assignment |
| `supporter@foodloop.demo` | 💚 Individual supporter | simulated contributions & history |

### Create a real administrator

Public sign-up can **never** create an administrator. Use the CLI:
```bash
npm run create-admin -- you@example.org "Your Name" "AStrongPassw0rd"
```
Existing admins can also create admins under **Admin → Users**.

---

## 🧭 How to use FoodLoop — guide for every role

<details open>
<summary><b>🍛 As a food donor (restaurant, caterer, bakery, individual)</b></summary>

1. **Register** at `/register` → choose *Food donor*. (Optional: add your business under **Business Profile**.)
2. **Add Food Donation** → choose *Everyday Surplus* or *Planned Fresh Donation*.
3. Fill in the food details, **preparation time, storage & measured temperature, packaging, allergens**, pickup window and **collection deadline**. Tick the two safety declarations.
4. Click **Submit for safety review**. FoodLoop runs automated checks immediately:
   - ❌ fails → the donation is rejected with the exact reasons (e.g. *"5 h at room temperature exceeds the 2 h limit"*)
   - ✅ passes → it waits for a coordinator's review (food is **never** published automatically)
5. When approved, verified NGOs are notified. Open **Incoming Requests** → **Accept** (or **Decline** with a reason).
6. Follow the pickup under **Collection Tracking**. You are notified when it is collected and when the NGO confirms delivery.
7. See your totals under **Impact Reports** and **Donation History** (CSV export available).
</details>

<details>
<summary><b>💒 As a wedding / event organiser</b></summary>

1. **Before the event:** **My Events → Register event**. Enter date, venue, caterer, expected guests, *estimated* surplus, collection window, containers, access instructions and give consent to be contacted. Click **Submit event details**.
2. A coordinator **confirms the collection plan** → status becomes *Awaiting Food Availability*.
3. **After the event:** open the event → **Donate Leftover Food Now**. Record the **actual** food, quantity, preparation time and temperature. (The earlier estimate is never counted as rescued food.)
4. The donation goes through the same screening → approval → request → pickup → delivery flow. The event status updates automatically: *Ready for Collection → Collection Arranged → Completed*.
5. **Food ready right now?** Use **Urgent Event Rescue** — coordinators are alerted immediately, and you are told honestly if no recipient can take it safely.
6. The event page shows **estimated vs offered vs accepted vs collected vs delivered**, incidents and a CSV export.
7. Venues, caterers and planners can register interest in recurring partnerships at `/events/partners`.
</details>

<details>
<summary><b>🏠 As an NGO / shelter / community kitchen</b></summary>

1. **Register** → choose *NGO / recipient organisation*.
2. Fill in **Organisation & Verification**: service address & radius, **daily capacity (kg)**, food preference (e.g. veg only), cold storage, transport, operating hours.
3. **Submit for verification** with a registration number and document (stored privately). Until an admin verifies you, you can browse but **not** request food.
4. **Browse Available Food** (`/discover`) — filter by category, source, city, quantity, deadline; sort by newest, deadline or distance.
5. Open a donation → FoodLoop checks whether you can **safely** receive it (capacity, distance, diet, storage, deadline) → **Request this food**, choosing volunteer pickup or your own transport.
6. When food arrives: **Deliveries & Receipts → Confirm receipt** with the actual kg — or **refuse** unsafe food (this creates a safety incident and it is not counted).
7. Publish standing needs under **Food Requirements**, and report problems under **Report a Problem**.
</details>

<details>
<summary><b>🛵 As a volunteer</b></summary>

1. **Register** → *Volunteer*, then complete your **Volunteer Profile** (areas, availability, vehicle).
2. **Available Tasks** shows open pickups (exact address hidden until you accept). Pick a time → **Accept task**. Only one volunteer can take each task.
3. **My Assignments** shows the full pickup address, contact and drop-off.
4. At pickup, tick the **safety checklist** (covered, temperature maintained, no spoilage, clean vehicle) and enter kg collected → **Record pickup**. If anything fails, leave it unticked: the food is blocked and an incident is created.
5. At the NGO → **Record handover** (kg + minutes spent, logged as volunteer hours).
6. Can't make it? **Release task** or **Report missed pickup** so a coordinator can re-arrange.
</details>

<details>
<summary><b>💚 As a supporter</b></summary>

1. Go to **Donate Money**, choose a meal programme, pick an amount (₹250–₹5,000 or custom), enter your name & email.
2. In demo mode you see a checkout clearly marked **DEMO MODE — NO REAL MONEY IS TRANSFERRED** → simulate success, failure or cancel.
3. View the transaction record with its verification trail, and your history under **My Contributions**.
</details>

<details>
<summary><b>🛡️ As an administrator / coordinator</b></summary>

| Page | What you do |
|---|---|
| **Platform Overview** | Queues needing attention, urgent rescues, monthly deliveries |
| **Listing Moderation** | Open a pending listing → confirm the manual safety checklist → **Approve & publish** or **Reject**; **Block as unsafe** at any stage |
| **Events** | **Confirm collection plans** for registered events; filter by date/status |
| **Logistics & Collections** | Assign / re-assign volunteers & transport partners; see delayed, urgent and failed pickups; re-arrange or close failed collections |
| **NGO Verification** | Verify / reject (reason required), suspend / reinstate organisations; download protected documents |
| **Users** | Suspend / reinstate accounts (reason required), create administrators |
| **Safety Incidents** | Investigate, resolve, release safety holds or reject the donation |
| **Payments & Funds** | All transactions, refunds, disbursement ledger |
| **Venue Partners** | Review applications; record a signed agreement before a partner is shown publicly |
| **Reports & Exports** | Impact with date filters; CSV exports of every dataset |
| **Audit Log** | Who did what, when and why |
| **Platform Settings** | Food-safety thresholds and the kg-per-meal estimate |
</details>

---

## 🎤 Presentation script (5 scenarios)

> Run `npm run db:reset` first. Use `/demo` to switch accounts with one click.

**Scenario A — a restaurant donates surplus food to an NGO**
1. Sign in as **Annapurna (NGO)** → *Browse Available Food* → **Veg biryani & dal tadka** → *Request this food*.
2. Sign in as **Spice Route Kitchen** → *Incoming Requests* → **Accept**.
3. Sign in as **volunteer Arjun** → *Available Tasks* → **Accept task** → *My Assignments* → tick the checklist → **Record pickup** → **Record handover**.
4. Sign in as **Annapurna** → *Deliveries* → **Confirm receipt**. Open `/impact` — the delivered total has increased.

**Scenario B — a wedding's leftover food**
1. Sign in as the **wedding organiser** → *My Events* → **Iyer–Menon Wedding Reception** (already confirmed) → **Donate Leftover Food Now** → fill in the actual food (hot-held at 64 °C, prepared 1 h ago) → submit.
2. Sign in as **admin** → *Listing Moderation* → open it → tick the checklist → **Approve & publish**.
3. NGO requests → organiser accepts → admin assigns a volunteer in *Logistics* → volunteer picks up & delivers → NGO confirms.
4. Back on the event page: status **Completed**, and estimated vs actual vs delivered side by side.

**Scenario C — a donor sponsors fresh meals**
Sign in as **Golden Crust Bakery** → see the bread donation requested by Hope Shelter → **Accept**. Then show `/fresh` (fresh-food donation + meal sponsorship programmes).

**Scenario D — a simulated money contribution**
Sign out → **Donate Money** → choose a programme → *Continue to demo checkout* → note the **DEMO MODE** banner → *Simulate successful payment* → transaction record marked **SIMULATED**.

**Scenario E — admin verifies an NGO and reviews an incident**
Sign in as **admin** → *NGO Verification* → **New Dawn Children's Home** → write a reason → **Verify**. Then *Safety Incidents* → resolve the bread packaging report → show it in the **Audit Log**.

**Bonus — food safety:** as any donor, list cooked food prepared 6 hours ago at room temperature → it is **automatically rejected** with the reason shown.

---

## ✨ Features in detail

<details>
<summary><b>Food donation system</b></summary>

- Fields: title, category, description, quantity & unit, approx. weight (kg), preparation/packing time, expiry/use-by, storage condition, measured temperature, storage history, packaging condition, allergens, food type (veg / non-veg / mixed), handling info, pickup address, city, coordinates, pickup window, collection deadline, contact person & phone, photo, instructions, safety concerns, intended recipient, urgent flag.
- Categories: Cooked Meals, Packaged Food, Bakery, Fruits, Vegetables, Groceries, Freshly Prepared Meals, Wedding & Event Surplus, Other.
- Sources: everyday surplus, planned fresh donation, registered event.
- Statuses: Draft → Pending Review → Available → Request Received → Accepted → Pickup Scheduled → Collected → Delivered, plus Rejected, Cancelled, Expired. Invalid transitions are rejected on the server.
- Unique tracking ID (`FL-2026-0001`) and a complete, timestamped history with who made each change.
</details>

<details>
<summary><b>Wedding & event food rescue</b></summary>

- 14 event types (wedding, marriage ceremony, reception, engagement, birthday, anniversary, religious, festival, community, corporate, college fest, conference, family function, other).
- Event registration is separate from food. Event statuses: Registered → Awaiting Confirmation → Awaiting Food Availability → Ready for Collection → Collection Arranged → Completed / Cancelled. The last steps are derived from the event's actual food.
- Post-event leftover donation, urgent rescue with urgency badges, event-to-NGO matching, cancellation cascades, event incidents, event CSV export, venue/caterer partner applications.
</details>

<details>
<summary><b>Matching</b></summary>

An NGO is eligible only if it is **verified**, within its **service radius**, can **arrive before the deadline**, has **enough remaining daily capacity**, accepts the **food type**, and has **cold storage** for chilled/frozen food. Every match shows its reasons or blockers. If none is eligible, the donor and coordinators are told clearly — the food is not shown as rescued.
</details>

<details>
<summary><b>Logistics</b></summary>

Collections: Available → Assigned → In Transit → Completed, or Cancelled / Failed. Atomic volunteer claims (no double assignment), coordinator assignment with transport partner, pickup safety checklist, handover with volunteer minutes, missed-pickup reporting, re-arranging or closing failed collections, automatic expiry when deadlines pass.
</details>

<details>
<summary><b>Notifications</b></summary>

In-app notifications with unread badge, timestamps and links for: new listings, approval/rejection, new requests, acceptance/rejection, pickup scheduled, volunteer assignment, collection, delivery, event registration/confirmation/cancellation, urgent rescues, no-match alerts, payments, verification decisions and incident updates. (Email/WhatsApp are not configured — see limitations.)
</details>

<details>
<summary><b>Impact reporting</b></summary>

Food offered, accepted after screening, collected and delivered (kg) are tracked **separately**. Delivered counts only recipient-confirmed quantities — one confirmation per donation, enforced by the database, so food is never double-counted. Also: active donors, verified NGOs, events registered / offering food / completed, event food delivered, fresh-food deliveries, volunteer assignments & hours, provider-confirmed vs simulated money, refunds, disbursements, rejections & reasons, monthly chart, source & category breakdowns, a **clearly-labelled meal estimate** (kg ÷ 0.4 kg/meal), date filters, demo/real toggle and CSV export.
</details>

---

## 🛠 Technology stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router, Server Components, Server Actions), **React 19** |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS 4**, Lucide icons, Plus Jakarta Sans + Fraunces fonts |
| Validation | **Zod** (server-side, per-field error messages) |
| Database | **SQLite** via Node's built-in `node:sqlite` — foreign keys, CHECK constraints, partial unique indexes, transactions |
| Charts / maps | **Recharts**, **Leaflet** + OpenStreetMap |
| Payments | Simulated checkout, or **Razorpay** (sandbox/live) when keys are set |
| Tests | **Vitest** |
| Production schema | PostgreSQL / **Supabase** migration with Row Level Security (`supabase/migrations`) |

> **Why SQLite?** The app had to run with zero external credentials. SQLite gives a real, persistent relational database with no setup. A Supabase/PostgreSQL schema is included for a future production move.

---

## 🧱 Project structure & architecture

```
foodloop/
├─ src/
│  ├─ app/                    # Routes
│  │  ├─ page.tsx             # Home
│  │  ├─ events/ discover/ donate/ donate-money/ fresh/ impact/ ...   # Public pages
│  │  ├─ dashboard/           # Donor, NGO, volunteer & supporter dashboards
│  │  ├─ admin/               # Administrator area
│  │  └─ api/                 # Uploads, CSV exports, Razorpay verify & webhook
│  ├─ components/             # UI components (forms, charts, map, navigation…)
│  ├─ lib/
│  │  ├─ db/                  # SQLite connection + schema
│  │  ├─ services/            # ALL business rules (listings, logistics, events,
│  │  │                       #   organisations, payments, incidents, impact…)
│  │  ├─ actions/             # Server actions: validate → call service → refresh
│  │  ├─ safety.ts            # Automated food-safety screening
│  │  ├─ matching.ts          # NGO eligibility & scoring
│  │  ├─ workflow.ts          # State machines (listing, event, payment)
│  │  ├─ permissions.ts       # Role → permission matrix
│  │  ├─ validation.ts        # Zod schemas
│  │  └─ seed.ts              # Demo data
│  └─ middleware.ts           # Fast redirect for signed-out users
├─ scripts/                   # seed, migrate, create-admin
├─ tests/                     # Vitest tests
├─ supabase/migrations/       # PostgreSQL + RLS schema
├─ docs/screenshots/          # Images used in this README
└─ public/images/             # Bundled stock photos
```

**Design principle:** every business rule lives in `src/lib/services`. Each service function receives the signed-in user ("actor"), checks permissions and allowed status changes itself, and runs inside a database transaction. Pages and server actions never write to the database directly — so the rules are identical everywhere and fully testable without a browser.

---

## 🗄 Database

The schema (`src/lib/db/schema.ts`) is applied automatically on first run.

**Tables:** `users`, `sessions`, `password_resets`, `organizations` (donor & recipient), `verification_requests`, `volunteer_profiles`, `events`, `partner_applications`, `food_listings`, `safety_screenings`, `food_needs`, `donation_requests`, `collections`, `delivery_confirmations`, `meal_programs`, `monetary_donations`, `payment_transactions`, `refunds`, `disbursements`, `notifications`, `incidents`, `status_history`, `audit_logs`, `settings`.

**Integrity enforced by the database itself:**
- One open request per NGO per listing, one accepted request per listing
- One active collection per listing → **no duplicate volunteer assignments**
- `delivery_confirmations.listing_id` is UNIQUE → **delivered food is never double-counted**
- `payment_transactions.provider_event_id` is UNIQUE → **each payment event is processed once**
- CHECK constraints on every status, role and quantity; foreign keys throughout

```bash
npm run db:migrate   # apply schema
npm run db:seed      # load demo data
npm run db:reset     # wipe everything and reload demo data
```

The PostgreSQL / Supabase version — with Row Level Security policies, a status-transition trigger and guards against users granting themselves admin — is in `supabase/migrations/0001_foodloop.sql`.

---

## 🛡 Food-safety model

Food safety matters more than donation numbers. Four checkpoints:

1. **Automated screening** when a donation is submitted
2. **Coordinator review** with a manual checklist — the only way food becomes visible
3. **Pickup checklist** by the volunteer — any failure blocks the food and opens an incident
4. **Recipient acknowledgement** — the NGO confirms condition and quantity, or refuses

| Rule (admin-configurable, never less strict) | Default |
|---|---|
| Hot-held food temperature | ≥ 60 °C, ≤ 6 h from preparation to deadline |
| Refrigerated cooked food | ≤ 5 °C, ≤ 24 h |
| Cooked food at room temperature | ≤ 2 h |
| Packaged food & groceries | must not expire before the collection deadline |
| Always rejected | plated / partially eaten food, uncovered or unknown storage, damaged packaging, no allergen declaration |

Any participant can report an incident; a **high-severity** food-safety report puts the donation **on hold** until a coordinator releases or rejects it.

> These thresholds are FoodLoop operating rules based on widely published food-safety principles (e.g. WHO *Five Keys to Safer Food*). They are **not a statement of Indian law**. Follow official FSSAI guidance at [fssai.gov.in](https://www.fssai.gov.in). FoodLoop coordinates donations; it does not replace safe handling, licensing or legal compliance, and provides no legal protection to donors.

---

## 💳 Payments & the Razorpay sandbox

**Without keys (default):** a simulated checkout with the banner **"DEMO MODE — NO REAL MONEY IS TRANSFERRED."** You choose success, failure or cancel. Every record is marked *simulated*.

**With the Razorpay sandbox:**
1. Create a Razorpay account → switch to **Test Mode** → copy the test Key ID and Key Secret.
2. In `.env.local` set:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=choose-a-secret
   ```
3. In the Razorpay dashboard add a webhook to `https://<your-host>/api/payments/razorpay/webhook` with events `payment.captured`, `payment.failed`, `refund.processed` and the same secret. (Locally, expose your server with a tunnel such as ngrok.)
4. Restart the app.

**How a payment is confirmed:** server creates an order → Razorpay Checkout collects payment details (FoodLoop never sees card numbers, CVV, UPI PIN or bank details) → the server verifies the HMAC signature **and re-fetches the payment from Razorpay** (amount and order must match) — or a **signed webhook** confirms it. A browser redirect alone never marks a payment successful. Allowed statuses: `created → pending → succeeded | failed | cancelled`, and `succeeded → refunded`.

> Before accepting real money you need a legally registered organisation, a bank account in its name, provider KYC, accounting/receipting processes and legal advice. FoodLoop makes **no tax-benefit claims**.

---

## 🔐 Security & privacy

- Passwords hashed with salted **scrypt**; sessions are random tokens stored only as SHA-256 hashes in HTTP-only, SameSite cookies (Secure in production); sessions end on suspension or password reset.
- **Server-side authorization** on every page, action and API route (the middleware is only a fast redirect).
- Public sign-up can never create an administrator.
- Sensitive admin decisions require a **reason** and are written to an **audit log**.
- Exact pickup addresses and phone numbers are visible only to the donor, the accepted NGO, the assigned volunteer and admins; maps show a ~1 km approximate area to everyone else.
- Uploads: size limits, file type detected from content (not the file name), random names, stored outside `public/`; verification documents downloadable only by their owner and admins.
- Rate limiting on sign-in, sign-up, password reset, listings, requests, donations and demo reset.
- CSV exports are protected against spreadsheet formula injection; standard security headers are set.
- **No personal data about beneficiaries** is collected.
- The privacy policy and terms pages are **placeholders that need legal review**.

---

## 🧪 Testing

```bash
npm test
```

**28 automated tests** run against a fresh temporary database:

- ✅ Scenario A end to end, with exact impact changes and a **no double-counting** check
- ✅ Scenario B wedding flow — estimates not counted, event status progression, event impact
- ✅ Food is never published automatically; unsafe or invalid listings are rejected
- ✅ Authorization — NGOs can't approve, unverified NGOs can't request, donors can't touch others' food, completed donations can't change, duplicate volunteer claims are blocked
- ✅ Capacity and veg-only matching; "no eligible recipient" is reported
- ✅ Pickup-check failure, refusal on arrival, safety holds, admin rejection, expiry
- ✅ Missed pickup → re-arrange → re-assign
- ✅ Event cancellation cascades; organisers can't attach food to others' events
- ✅ Password hashing, no admin self-registration, suspended sessions revoked
- ✅ NGO verification is admin-only with a reason and an audit entry
- ✅ Payments: simulated labelling, exactly-once processing, invalid transitions rejected, guest access token, checkout & webhook signature verification, browser data alone can't confirm a payment
- ✅ Safety rules and upload type detection

Also checked during development (not part of `npm test`): every page loaded as 8 different roles (736 requests, 0 server errors), 12 HTTP authorization checks, and a headless Microsoft Edge run of Scenarios A, B, D, E, unsafe-food rejection and mobile navigation through the real UI.

---

## 📜 All commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run setup` | Create the database and load demo data |
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Start the production server |
| `npm test` | Run the test suite |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Apply the database schema |
| `npm run db:seed` | Load demo data |
| `npm run db:reset` | Wipe all data and reload demo data |
| `npm run create-admin -- <email> "<name>" "<password>"` | Create an administrator |

---

## ⚙️ Environment variables

Copy `.env.example` to `.env.local`. All values are optional.

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Public base URL |
| `DEMO_MODE` | `true` | Enables `/demo`, one-click demo login and demo reset. **Set to `false` for any public deployment.** |
| `DATABASE_FILE` | `./data/foodloop.db` | SQLite database file |
| `UPLOAD_DIR` | `./storage` | Food photos and private verification documents |
| `RAZORPAY_KEY_ID` | *(empty)* | Empty = simulated payments; `rzp_test_…` = sandbox |
| `RAZORPAY_KEY_SECRET` | *(empty)* | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | *(empty)* | Required to accept Razorpay webhooks |

Never commit `.env.local` — it is already in `.gitignore`.

---

## ☁️ Deployment

FoodLoop needs **Node 22.13+** and a **persistent disk** (for the SQLite file and uploads). It will not work on serverless hosts with temporary file systems (such as Vercel) without first moving to PostgreSQL/Supabase.

Example on a VM, Render, Railway or Fly.io with a mounted volume:

```bash
npm ci
npm run build
DEMO_MODE=false DATABASE_FILE=/data/foodloop.db UPLOAD_DIR=/data/storage npm start
npm run create-admin -- admin@yourorg.org "Admin" "StrongPass123"
```

Serve it over HTTPS, back up `/data` regularly, and run a single instance.

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| `npm error Cannot read properties of null (reading 'edgesOut')` | npm bug — keep the included `.npmrc`, or run `npm install --legacy-peer-deps` |
| `process.getBuiltinModule is not a function` or `node:sqlite` not found | Upgrade Node.js to 22.13 or newer |
| Every listing shows **Expired** | Demo deadlines are relative to seeding time → `npm run db:reset` |
| Demo sign-in says *Unknown demo account* | Load demo data → `npm run setup` |
| `database is locked` | Another process is using the DB (e.g. two dev servers) — stop it |
| Port 3000 already in use | Stop the other server, or run `npx next dev -p 3001` |
| Map is blank | OpenStreetMap tiles need internet; everything else works offline |
| Changes not showing in production mode | Re-run `npm run build` before `npm start` |

---

## ⚠️ Known limitations

- **Supabase is not connected yet.** The app runs on SQLite. The included PostgreSQL/Supabase migration is the target schema but has **not been run against PostgreSQL**.
- **Email and WhatsApp notifications are not implemented** — in-app notifications only. In demo mode the password-reset link is shown on screen.
- **Razorpay sandbox was not tested against Razorpay's servers** (no test keys were available). Monthly donations are recorded as pledges; automatic renewals are not implemented.
- An NGO requests a whole donation; splitting one donation between several NGOs isn't supported.
- Distance is straight-line with an assumed 20 km/h city speed, not road routing.
- Designed for a single server instance (in-memory rate limiting, SQLite).
- Stock photos (Unsplash, bundled locally) are shown when donors don't upload one.
- The privacy policy, terms and data-retention rules need legal review. FoodLoop is a student project — not a registered charity, and not FSSAI-registered.
- Food-safety thresholds are operating rules, not legal standards.

---

<div align="center">

Made with 💚 by **[daanialmirza5](https://github.com/daanialmirza5)** — a social-impact project to reduce food waste and hunger.

</div>
