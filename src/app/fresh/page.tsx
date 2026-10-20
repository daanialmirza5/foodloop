import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShoppingBasket, Utensils } from "lucide-react";
import { listNeeds } from "@/lib/services/needs";
import { listPrograms } from "@/lib/services/payments";
import { CATEGORY_LABELS, type FoodCategory } from "@/lib/constants";
import { formatDateTime, formatInr, formatKg } from "@/lib/format";
import { DemoBadge, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Fresh meals & meal sponsorship" };

export default function Fresh() {
  const needs = listNeeds({ openOnly: true });
  const programs = listPrograms();
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Fresh food & sponsorship" title="Donate fresh meals, groceries — or sponsor meals" subtitle="Planned donations follow exactly the same safety standards as surplus and event rescue." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Donate fresh food">
          <ol className="space-y-3 text-sm text-ink/80">
            {[
              [Utensils, "Choose the food type and quantity — cooked meals, groceries, fruit, bakery or packaged food."],
              [ClipboardCheck, "Enter preparation, storage, packaging and allergen details. We screen it automatically and a coordinator reviews it."],
              [ShoppingBasket, "Pick a recipient below or let FoodLoop match a verified organisation with capacity. Track pickup and delivery."],
            ].map(([Icon, t], i) => {
              const I = Icon as typeof Utensils;
              return (
                <li key={i} className="flex gap-3">
                  <I className="mt-0.5 size-4 shrink-0 text-forest-600" /> {t as string}
                </li>
              );
            })}
          </ol>
          <Link href="/dashboard/listings/new?source=fresh_donation" className="btn-primary mt-5">
            Start a fresh donation
          </Link>
        </Section>
        <Section title="What organisations need now" description="Standing requirements published by verified NGOs.">
          {needs.length ? (
            <ul className="space-y-3">
              {needs.map((n) => (
                <li key={n.id} className="rounded-xl bg-sand/50 p-3 text-sm">
                  <p className="font-semibold text-forest-900">
                    {n.title} <DemoBadge show={n.is_demo} />
                  </p>
                  <p className="text-xs text-muted">
                    {n.org_name}, {n.org_city} · {CATEGORY_LABELS[n.category as FoodCategory]} · {formatKg(n.quantity_kg)} {n.needed_by && `· by ${formatDateTime(n.needed_by)}`}
                  </p>
                  {n.notes && <p className="mt-1 text-xs">{n.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open requirements right now.</p>
          )}
        </Section>
      </div>
      <h2 className="mb-4 mt-12 font-display text-2xl font-semibold text-forest-900">Sponsor meals</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {programs.map((p) => (
          <div key={p.id} className="card flex flex-col overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image && <img src={p.image} alt="" className="aspect-[16/9] w-full object-cover" />}
            <div className="flex flex-1 flex-col p-5">
              <p className="font-semibold text-forest-900">
                {p.title} <DemoBadge show={p.is_demo} />
              </p>
              <p className="text-xs text-muted">{p.org_name}</p>
              <p className="mt-2 flex-1 text-sm text-ink/75">{p.summary}</p>
              {p.est_cost_per_meal_paise ? <p className="mt-2 text-xs text-muted">Illustrative estimate ~{formatInr(p.est_cost_per_meal_paise)}/meal (unverified)</p> : null}
              <Link href={`/donate-money?program=${p.id}`} className="btn-secondary mt-4">
                Sponsor <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
