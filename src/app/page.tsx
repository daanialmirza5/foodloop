import Link from "next/link";
import { ArrowRight, Bike, CalendarHeart, CheckCircle2, ClipboardCheck, HandHeart, HeartHandshake, IndianRupee, PackageCheck, Search, ShieldCheck, Soup, Thermometer, Truck, Users, Utensils } from "lucide-react";
import { computeImpact, hasDemoData } from "@/lib/services/impact";
import { searchListings } from "@/lib/services/listings";
import { isDemoMode } from "@/lib/utils";
import { formatInr, formatKg } from "@/lib/format";
import { ListingCard } from "@/components/listing-card";
import { FunnelBar } from "@/components/charts";
import { DemoBadge } from "@/components/ui";

const FAQ = [
  ["Can I donate leftover food from a wedding?", "Yes — if it was kept safely. Register the event in advance, then after the function use “Donate Leftover Food Now” to record the actual food, how it was stored and when it was prepared. Food that was served on guests’ plates, partially eaten, or left uncovered at room temperature cannot be redistributed."],
  ["Who checks that the food is safe?", "Every submission passes automated time–temperature, packaging, allergen and expiry checks, then a trained coordinator reviews it before it becomes visible. Volunteers confirm a pickup checklist and the receiving organisation confirms the condition on arrival. Unsafe food is rejected at any stage."],
  ["Can individuals receive food directly?", "FoodLoop delivers to verified NGOs, shelters and community kitchens, who distribute to the people they serve. If you need food, the Find Food Support page lists verified organisations near you. We never ask for beneficiaries’ personal details."],
  ["How do NGOs join?", "Register as an NGO / recipient organisation, complete your profile (capacity, storage, service area) and submit verification documents. Only an administrator can verify an organisation; until then you cannot request food."],
  ["Is my money donation real and tax-deductible?", "This build runs in demonstration mode: payments are simulated and no money moves. FoodLoop does not offer tax benefits. Real donations require a properly registered organisation and a configured payment gateway."],
  ["Does FoodLoop give legal protection to donors?", "No. FoodLoop coordinates donations and keeps records, but it does not replace safe food handling, applicable FSSAI guidance or legal compliance by donors and recipients."],
];

export default function Home() {
  const demo = isDemoMode() && hasDemoData();
  const impact = computeImpact({ includeDemo: demo });
  const preview = searchListings({ pageSize: 3, sort: "newest" });

  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="fade-up">
            <p className="eyebrow">Rescue Food · Share Hope · Feed Communities</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.08] text-forest-900 sm:text-5xl lg:text-6xl">Good Food Deserves Another Chance.</h1>
            <p className="mt-5 max-w-xl text-lg text-ink/75">FoodLoop connects surplus food, fresh meals, generous donors, volunteers, and communities to help good food reach people who need it.</p>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <Link href="/donate" className="btn-primary px-5 py-3">
                <HandHeart className="size-4" /> Donate Food
              </Link>
              <Link href="/events" className="btn-accent px-5 py-3">
                <CalendarHeart className="size-4" /> Rescue Event Food
              </Link>
              <Link href="/find-support" className="btn-secondary px-5 py-3">
                <Search className="size-4" /> Find Food Support
              </Link>
              <Link href="/donate-money" className="btn-secondary px-5 py-3">
                <IndianRupee className="size-4" /> Donate Money
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="size-4 text-forest-600" /> Every donation is safety-screened, tracked and confirmed on delivery.
            </p>
          </div>
          <div className="relative">
            <div className="grid grid-cols-5 grid-rows-6 gap-3 sm:h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/buffet.jpg" alt="Covered buffet dishes at a catered event" className="col-span-3 row-span-4 h-full min-h-48 w-full rounded-3xl object-cover shadow-[var(--shadow-lift)]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/volunteers.jpg" alt="Volunteers in gloves and masks unloading boxes of food" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero.jpg" alt="Fresh fruit and vegetables at a market" className="col-span-2 row-span-3 h-full w-full rounded-3xl object-cover" />
              <div className="col-span-3 row-span-2 flex flex-col justify-center rounded-3xl bg-forest-800 p-5 text-white">
                <p className="text-sm text-forest-200">Confirmed delivered {demo && <DemoBadge />}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{formatKg(impact.delivered.kg)}</p>
                <p className="text-xs text-forest-200">across {impact.delivered.n} recipient-confirmed donations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section className="bg-white py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The problem</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">Good food is thrown away while people nearby go hungry.</h2>
          </div>
          <div className="space-y-4 text-ink/75">
            <p>Restaurants, caterers, hostels and especially weddings and large celebrations often prepare more food than is eaten. Without a quick, trusted way to hand it over safely, that food is usually discarded within hours.</p>
            <p>At the same time, shelters and community kitchens work hard to feed people every day. The gap is not generosity — it is <strong>coordination, timing and trust</strong>: knowing who has food, who can receive it safely, and who can carry it there before it is no longer safe to eat.</p>
            <p className="text-sm text-muted">FoodLoop does not publish third-party statistics on this site; see the Food Safety page for official resources.</p>
          </div>
        </div>
      </section>

      {/* 3. Three pathways */}
      <section className="py-16">
        <div className="container-page">
          <p className="eyebrow text-center">Three ways to make a difference</p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold text-forest-900">One loop, connected end to end</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: Soup, title: "Rescue Surplus Food", body: "Restaurants, hotels, canteens and events list safe surplus. Verified NGOs request it and volunteers collect it before the deadline.", href: "/donate", cta: "List surplus food" },
              { icon: Utensils, title: "Donate Fresh Meals", body: "Cook or buy fresh meals and groceries specifically to give. Choose a recipient or let FoodLoop match you with one that has capacity.", href: "/fresh", cta: "Plan a fresh donation" },
              { icon: HeartHandshake, title: "Fund Meals", body: "Support verified meal programmes and rescue logistics. Every contribution is tracked from payment to recorded disbursement.", href: "/donate-money", cta: "Support a programme" },
            ].map((p) => (
              <div key={p.title} className="card flex flex-col p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-forest-50 text-forest-700">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-forest-900">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink/70">{p.body}</p>
                <Link href={p.href} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:gap-2">
                  {p.cta} <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Wedding & event rescue */}
      <section className="py-6">
        <div className="container-page">
          <div className="grid overflow-hidden rounded-3xl bg-forest-900 text-white lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-saffron-400">Wedding & Event Food Rescue</p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Turn Every Celebration Into Someone&apos;s Meal.</h2>
              <p className="mt-4 text-forest-100">Register your wedding, reception or festival in advance. After the event, report the actual leftover food in minutes — FoodLoop screens it, alerts verified NGOs nearby and arranges a volunteer pickup.</p>
              <ul className="mt-6 space-y-2 text-sm text-forest-100">
                {["Plan ahead: register the event and collection window", "After the event: “Donate Leftover Food Now”", "Urgent rescue for food available right now", "Track collection and delivery on your event dashboard"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-400" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard/events/new" className="btn-accent">
                  Register an event
                </Link>
                <Link href="/dashboard/events/urgent" className="btn border border-white/30 text-white hover:bg-white/10">
                  Urgent rescue now
                </Link>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/wedding.jpg" alt="Decorated wedding reception tables" className="h-64 w-full object-cover lg:h-full" />
          </div>
        </div>
      </section>

      {/* 5. How it works */}
      <section className="py-16">
        <div className="container-page">
          <p className="eyebrow">How FoodLoop works</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">From surplus to served, with a record at every step</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Utensils, t: "List", d: "Donor lists food with preparation time, storage, allergens and a collection deadline." },
              { icon: ClipboardCheck, t: "Screen", d: "Automated safety rules plus a coordinator review. Unsafe food never goes live." },
              { icon: Users, t: "Match & request", d: "Verified NGOs with capacity, storage and the right diet request it." },
              { icon: Truck, t: "Collect", d: "A volunteer claims the task, checks the food at pickup and carries it." },
              { icon: PackageCheck, t: "Confirm", d: "The NGO confirms the quantity received — only then does it count as impact." },
            ].map((s, i) => (
              <li key={s.t} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-saffron-100 text-sm font-bold text-saffron-700">{i + 1}</span>
                  <s.icon className="size-5 text-forest-600" />
                </div>
                <p className="mt-3 font-semibold text-forest-900">{s.t}</p>
                <p className="mt-1 text-sm text-ink/70">{s.d}</p>
              </li>
            ))}
          </ol>
          <Link href="/how-it-works" className="link mt-6 inline-block text-sm">
            See the full workflow →
          </Link>
        </div>
      </section>

      {/* 6. Listings preview */}
      <section className="bg-white py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Available now</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">Food waiting for a recipient</h2>
            </div>
            <Link href="/discover" className="btn-secondary">
              Browse all food <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {preview.rows.length ? (
              preview.rows.map((l) => <ListingCard key={l.id} l={l} />)
            ) : (
              <p className="text-sm text-muted sm:col-span-3">No food is open for requests right now. New listings appear here after safety review.</p>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">Exact pickup addresses are shared only with the accepted recipient and assigned volunteer.</p>
        </div>
      </section>

      {/* 7. Donors & NGOs  8. Volunteers */}
      <section className="py-16">
        <div className="container-page grid gap-5 lg:grid-cols-3">
          <div className="card p-7">
            <HandHeart className="size-7 text-forest-600" />
            <h3 className="mt-4 text-xl font-semibold text-forest-900">For food donors</h3>
            <p className="mt-2 text-sm text-ink/70">Restaurants, caterers, bakeries, supermarkets, hostels, offices and families. List in two minutes, approve requests, and get a delivery confirmation for every donation.</p>
            <Link href="/register?role=donor" className="btn-primary mt-6">
              Join as a donor
            </Link>
          </div>
          <div className="card p-7">
            <Users className="size-7 text-forest-600" />
            <h3 className="mt-4 text-xl font-semibold text-forest-900">For NGOs & shelters</h3>
            <p className="mt-2 text-sm text-ink/70">Get verified, set your capacity and food preferences, and request nearby food that you can store and serve safely. Post standing requirements for groceries.</p>
            <Link href="/register?role=ngo" className="btn-primary mt-6">
              Register your organisation
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-saffron-100 p-7">
            <Bike className="size-7 text-saffron-700" />
            <h3 className="mt-4 text-xl font-semibold text-forest-900">Volunteer as a food runner</h3>
            <p className="mt-2 text-sm text-ink/75">Pick tasks near you that fit your schedule. Pickup details unlock only after you accept, and every hour you contribute is logged.</p>
            <Link href="/register?role=volunteer" className="btn-accent mt-6">
              Become a volunteer
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Food safety */}
      <section className="bg-white py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Food safety first</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">Safety matters more than numbers.</h2>
            <p className="mt-4 text-ink/75">FoodLoop would rather reject a donation than risk someone’s health. Safety checks run at listing, review, pickup and delivery — and any participant can raise an incident that puts food on hold.</p>
            <Link href="/food-safety" className="link mt-5 inline-block text-sm">
              Read our food-safety rules →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Thermometer, t: "Time & temperature", d: "Hot food ≥ 60°C, chilled ≤ 5°C, max 2 h at room temperature." },
              { icon: ShieldCheck, t: "Never served food", d: "Plated or partially eaten food is always rejected." },
              { icon: ClipboardCheck, t: "Allergens declared", d: "Every listing records known allergens and food type." },
              { icon: PackageCheck, t: "Traceable", d: "Each donation has a tracking ID and complete history." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-black/5 bg-cream p-5">
                <s.icon className="size-5 text-forest-600" />
                <p className="mt-2 font-semibold text-forest-900">{s.t}</p>
                <p className="mt-1 text-sm text-ink/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Impact */}
      <section className="py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Impact {demo && <DemoBadge />}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">Measured from confirmed records</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                {demo ? "These figures currently include fictional demonstration records." : "Figures count real platform records only."} Offered, accepted, collected and delivered are tracked separately — only recipient-confirmed deliveries count as delivered.
              </p>
            </div>
            <Link href="/impact" className="btn-secondary">
              Full impact dashboard
            </Link>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Delivered (confirmed)", formatKg(impact.delivered.kg)],
                ["Successful donations", impact.delivered.n],
                ["Event collections completed", impact.events.completedCollections],
                ["Verified recipient orgs", impact.verifiedOrgs],
                ["Volunteer hours logged", impact.volunteer.hours],
                [demo ? "Simulated contributions" : "Provider-confirmed funds", formatInr(demo ? impact.money.simulated : impact.money.provider_confirmed)],
              ].map(([k, v]) => (
                <div key={k as string} className="card p-5">
                  <p className="text-xs font-medium text-muted">{k}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-forest-900">{v}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <p className="text-sm font-semibold text-forest-900">Food journey (kg)</p>
              <FunnelBar
                data={[
                  { stage: "Offered", kg: impact.offered.kg },
                  { stage: "Accepted", kg: impact.accepted.kg },
                  { stage: "Collected", kg: impact.collected.kg },
                  { stage: "Delivered", kg: impact.delivered.kg },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="bg-white py-16">
        <div className="container-page max-w-3xl">
          <p className="eyebrow text-center">Questions</p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold text-forest-900">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-black/5 rounded-2xl border border-black/5">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-forest-900">
                  {q}
                  <span className="text-xl text-forest-500 transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-ink/75">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Final CTA */}
      <section className="pt-16">
        <div className="container-page">
          <div className="rounded-3xl bg-gradient-to-br from-forest-700 to-forest-900 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Every meal deserves a chance to make a difference.</h2>
            <p className="mx-auto mt-3 max-w-xl text-forest-100">Join donors, NGOs and volunteers who are closing the loop between surplus and need.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-accent px-6 py-3">
                Get Started
              </Link>
              <Link href="/how-it-works" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
