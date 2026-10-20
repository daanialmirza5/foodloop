import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck2, CalendarHeart, ClipboardCheck, Handshake, PackageCheck, Siren, Truck } from "lucide-react";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "@/lib/constants";
import { computeImpact, hasDemoData } from "@/lib/services/impact";
import { publicPartners } from "@/lib/services/events";
import { isDemoMode } from "@/lib/utils";
import { formatKg } from "@/lib/format";
import { DemoBadge } from "@/components/ui";

export const metadata = { title: "Event Food Rescue" };

export default function EventsLanding() {
  const demo = isDemoMode() && hasDemoData();
  const ev = computeImpact({ includeDemo: demo, source: "event_surplus" });
  const partners = publicPartners();
  return (
    <>
      <section className="relative isolate overflow-hidden bg-forest-900 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/wedding.jpg" alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-30" />
        <div className="container-page py-20 sm:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-saffron-400">Wedding, Marriage & Event Food Rescue</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">Turn Every Celebration Into Someone&apos;s Meal.</h1>
          <p className="mt-5 max-w-2xl text-lg text-forest-100">From weddings and receptions to parties and community events, help suitable surplus food reach people who need it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard/events/new" className="btn-accent px-5 py-3">
              <CalendarHeart className="size-4" /> Register an upcoming event
            </Link>
            <Link href="/dashboard/events" className="btn border border-white/30 px-5 py-3 text-white hover:bg-white/10">
              <PackageCheck className="size-4" /> Donate leftover food now
            </Link>
            <Link href="/dashboard/events/urgent" className="btn bg-red-600 px-5 py-3 text-white hover:bg-red-700">
              <Siren className="size-4" /> Urgent rescue
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: CalendarCheck2, t: "Before the event", d: "Register the date, venue, caterer, expected guests and collection window. A coordinator confirms the plan. Registration is a plan — not food." },
            { icon: ClipboardCheck, t: "After the event", d: "Open your event and click “Donate Leftover Food Now”. Record the ACTUAL food, quantity, preparation time, storage and temperature." },
            { icon: Truck, t: "Collection & delivery", d: "Food is screened, matched to verified NGOs that can safely receive it, collected by a volunteer and confirmed on delivery." },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <s.icon className="size-6 text-forest-600" />
              <h2 className="mt-3 text-lg font-semibold text-forest-900">{s.t}</h2>
              <p className="mt-2 text-sm text-ink/70">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-forest-900">Supported events</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <span key={t} className="rounded-full bg-forest-50 px-3 py-1 text-sm text-forest-800">
                  {EVENT_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-forest-900">
              Event rescue impact <DemoBadge show={demo} />
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Events registered", ev.events.registered],
                ["Events that offered food", ev.events.offeredFood],
                ["Completed event collections", ev.events.completedCollections],
                ["Event food offered", formatKg(ev.offered.kg)],
                ["Accepted after screening", formatKg(ev.accepted.kg)],
                ["Delivered (confirmed)", formatKg(ev.delivered.kg)],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-xl font-bold text-forest-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">Estimated surplus from registered events is never counted as rescued food.</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-saffron-100 p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <BellRing className="size-6 text-saffron-700" />
              <h2 className="mt-3 font-display text-2xl font-semibold text-forest-900">What food can be donated after a wedding?</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
                <li>✓ Untouched food from the kitchen or buffet trays that was kept hot (60°C+) or chilled (5°C or below)</li>
                <li>✓ Food packed promptly into clean, covered, food-grade containers</li>
                <li>✗ Food served on guests’ plates or partially eaten — never</li>
                <li>✗ Cooked food left at room temperature for more than about 2 hours</li>
                <li>✗ Food left uncovered, or whose storage is unknown</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/food-safety" className="btn-secondary">
                Read the safety rules
              </Link>
              <Link href="/events/partners" className="btn-primary">
                <Handshake className="size-4" /> Venue & caterer partnerships
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-forest-900">Partner venues & caterers</h2>
          {partners.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {partners.map((p) => (
                <li key={p.business_name} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-black/5">
                  {p.business_name} · {p.city} <DemoBadge show={p.is_demo} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No partnerships have been confirmed yet. We only list partners after verification and a signed agreement.{" "}
              <Link href="/events/partners" className="link">
                Become a partner <ArrowRight className="inline size-3.5" />
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
