import Link from "next/link";
import { CalendarHeart, Clock, MapPin, Scale } from "lucide-react";
import { CATEGORY_IMAGES, CATEGORY_LABELS, FOOD_TYPE_LABELS, SOURCE_LABELS, type FoodCategory, type FoodType, type Source } from "@/lib/constants";
import { formatDateTime, formatKg, timeUntil, cn } from "@/lib/format";
import { DemoBadge, Pill, StatusBadge, UrgencyBadge } from "./ui";

export type CardListing = {
  id: string;
  code: string;
  title: string;
  category: string;
  source: string;
  quantity: number;
  unit: string;
  quantity_kg: number;
  food_type: string;
  city: string | null;
  collection_deadline: string;
  status: string;
  is_urgent: number;
  is_demo: number;
  photo_path: string | null;
  event_name?: string | null;
  donor_org_name?: string | null;
  donor_name?: string;
};

export function listingImage(l: { photo_path: string | null; category: string }) {
  return l.photo_path ? `/api/uploads/${l.photo_path}` : (CATEGORY_IMAGES[l.category] ?? CATEGORY_IMAGES.other);
}

export function ListingCard({ l, href, layout = "grid", distanceKm }: { l: CardListing; href?: string; layout?: "grid" | "list"; distanceKm?: number }) {
  const link = href ?? `/discover/${l.id}`;
  const open = ["available", "request_received"].includes(l.status);
  return (
    <Link href={link} className={cn("card group flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]", layout === "grid" ? "flex-col" : "flex-col sm:flex-row")}>
      <div className={cn("relative shrink-0 overflow-hidden bg-sand", layout === "grid" ? "aspect-[16/10]" : "aspect-[16/10] sm:aspect-auto sm:w-56")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listingImage(l)} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {l.is_urgent ? <Pill tone="red" className="bg-red-600 text-white ring-red-600">Urgent rescue</Pill> : null}
          {l.source === "event_surplus" && <Pill tone="amber" className="bg-white/95">Event surplus</Pill>}
        </div>
        <div className="absolute right-3 top-3">
          <DemoBadge show={l.is_demo} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-forest-900 group-hover:text-forest-700">{l.title}</h3>
          <StatusBadge status={l.status} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {CATEGORY_LABELS[l.category as FoodCategory] ?? l.category} · {FOOD_TYPE_LABELS[l.food_type as FoodType] ?? l.food_type} · {SOURCE_LABELS[l.source as Source]}
        </p>
        {l.event_name && (
          <p className="mt-1 flex items-center gap-1 text-xs text-saffron-700">
            <CalendarHeart className="size-3.5" /> {l.event_name}
          </p>
        )}
        <div className="mt-3 grid gap-1.5 text-sm text-ink/80">
          <span className="flex items-center gap-2">
            <Scale className="size-4 text-forest-500" /> {l.quantity} {l.unit} · ~{formatKg(l.quantity_kg)}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-forest-500" /> {l.city ?? "—"}
            {distanceKm !== undefined && <span className="text-muted">· {distanceKm.toFixed(1)} km</span>}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-forest-500" /> Collect by {formatDateTime(l.collection_deadline)}
            {open && <span className="text-muted">({timeUntil(l.collection_deadline)})</span>}
          </span>
        </div>
        {open && (
          <div className="mt-3">
            <UrgencyBadge deadline={l.collection_deadline} />
          </div>
        )}
      </div>
    </Link>
  );
}
