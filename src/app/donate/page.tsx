import Link from "next/link";
import { ArrowRight, CalendarHeart, Siren, Soup, Utensils } from "lucide-react";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Donate food" };

const PATHS = [
  { icon: Soup, title: "Everyday surplus", body: "Restaurants, hotels, cafés, bakeries, supermarkets, caterers and canteens with safe food left over today.", href: "/dashboard/listings/new?source=everyday_surplus", cta: "List surplus food", img: "/images/indian.jpg" },
  { icon: Utensils, title: "Planned fresh donation", body: "Cook or buy fresh meals, groceries or packaged food specifically to give to a shelter or community kitchen.", href: "/dashboard/listings/new?source=fresh_donation", cta: "Plan a fresh donation", img: "/images/meal.jpg" },
  { icon: CalendarHeart, title: "Wedding & event leftovers", body: "Register your function in advance, then record the actual leftover food afterwards.", href: "/dashboard/events", cta: "Go to my events", img: "/images/buffet.jpg" },
];

export default function DonateHub() {
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Donate food" title="How would you like to donate?" subtitle="Every route uses the same safety screening, matching and delivery tracking. You'll need a free donor account." />
      <div className="grid gap-5 md:grid-cols-3">
        {PATHS.map((p) => (
          <Link key={p.title} href={p.href} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="p-5">
              <p.icon className="size-6 text-forest-600" />
              <h2 className="mt-3 text-lg font-semibold text-forest-900">{p.title}</h2>
              <p className="mt-1 text-sm text-ink/70">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 group-hover:gap-2">
                {p.cta} <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-red-50 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 font-semibold text-red-800">
            <Siren className="size-5" /> Food from an event available right now?
          </p>
          <p className="text-sm text-red-800/80">Use urgent rescue — coordinators are alerted immediately.</p>
        </div>
        <Link href="/dashboard/events/urgent" className="btn bg-red-600 text-white hover:bg-red-700">
          Urgent rescue
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        Not sure if your food is suitable? Read the <Link href="/food-safety" className="link">food-safety rules</Link> first. Prefer to give money? <Link href="/donate-money" className="link">Fund meals</Link>.
      </p>
    </div>
  );
}
