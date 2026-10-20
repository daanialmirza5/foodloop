import Link from "next/link";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { searchListings, distinctCities } from "@/lib/services/listings";
import { CATEGORY_LABELS, FOOD_CATEGORIES, SOURCES, SOURCE_LABELS } from "@/lib/constants";
import { ListingCard } from "@/components/listing-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { GeoButton } from "@/components/geo-button";
import { cn } from "@/lib/format";

export const metadata = { title: "Discover food" };

type SP = Record<string, string | undefined>;

export default async function Discover({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const n = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const view = sp.view === "list" ? "list" : "grid";
  const res = searchListings({
    q: sp.q?.slice(0, 80),
    category: sp.category,
    city: sp.city,
    source: sp.source,
    minKg: n(sp.minKg),
    maxKg: n(sp.maxKg),
    withinHours: n(sp.within),
    sort: (["newest", "deadline", "distance"].includes(sp.sort ?? "") ? sp.sort : "newest") as "newest",
    lat: n(sp.lat),
    lng: n(sp.lng),
    status: sp.status === "all" ? "all" : "open",
    page: n(sp.page) ?? 1,
  });
  const cities = distinctCities();
  const pages = Math.max(1, Math.ceil(res.total / res.pageSize));
  const qs = (patch: SP) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/discover?${p.toString()}`;
  };

  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Discover food" title="Food available for verified organisations" subtitle="Approved, safety-screened donations. Exact pickup addresses are shared only after a request is accepted." />

      <form id="filters" method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="relative sm:col-span-2">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" defaultValue={sp.q} placeholder="Search food, area…" className="input pl-9" />
        </div>
        <select name="category" defaultValue={sp.category ?? ""} className="input" aria-label="Category">
          <option value="">All categories</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className="input" aria-label="Donation source">
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="city" defaultValue={sp.city ?? ""} className="input" aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select name="within" defaultValue={sp.within ?? ""} className="input" aria-label="Collection deadline">
          <option value="">Any deadline</option>
          <option value="2">Within 2 hours</option>
          <option value="6">Within 6 hours</option>
          <option value="24">Within 24 hours</option>
        </select>
        <input name="minKg" type="number" min="0" placeholder="Min kg" defaultValue={sp.minKg} className="input" aria-label="Minimum kilograms" />
        <input name="maxKg" type="number" min="0" placeholder="Max kg" defaultValue={sp.maxKg} className="input" aria-label="Maximum kilograms" />
        <select name="sort" defaultValue={sp.sort ?? "newest"} className="input" aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="deadline">Deadline soonest</option>
          <option value="distance">Nearest (needs location)</option>
        </select>
        <select name="status" defaultValue={sp.status ?? "open"} className="input" aria-label="Status">
          <option value="open">Open for requests</option>
          <option value="all">All statuses (history)</option>
        </select>
        <input type="hidden" name="lat" defaultValue={sp.lat} />
        <input type="hidden" name="lng" defaultValue={sp.lng} />
        <input type="hidden" name="view" defaultValue={view} />
        <div className="flex gap-2 lg:col-span-2">
          <button className="btn-primary flex-1" type="submit">
            <SlidersHorizontal className="size-4" /> Apply
          </button>
          <Link href="/discover" className="btn-ghost">
            Clear
          </Link>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {res.total} donation{res.total === 1 ? "" : "s"} found
          {sp.sort === "distance" && !sp.lat && " — allow location to sort by distance"}
        </p>
        <div className="flex items-center gap-2">
          <GeoButton formId="filters" />
          <div className="flex rounded-xl bg-sand p-1" role="group" aria-label="View">
            <Link href={qs({ view: "grid" })} aria-label="Grid view" aria-current={view === "grid"} className={cn("rounded-lg p-1.5", view === "grid" && "bg-white shadow-sm")}>
              <LayoutGrid className="size-4" />
            </Link>
            <Link href={qs({ view: "list" })} aria-label="List view" aria-current={view === "list"} className={cn("rounded-lg p-1.5", view === "list" && "bg-white shadow-sm")}>
              <List className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {res.rows.length ? (
        <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4"}>
          {res.rows.map((l) => (
            <ListingCard key={l.id} l={l} layout={view} distanceKm={res.distances[l.id]} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Search className="size-5" />} title="No donations match these filters" body="Try widening the deadline or clearing filters. New food appears here once a coordinator approves it." action={<Link href="/discover" className="btn-secondary">Clear filters</Link>} />
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          {res.page > 1 && (
            <Link href={qs({ page: String(res.page - 1) })} className="btn-secondary btn-sm">
              Previous
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {res.page} of {pages}
          </span>
          {res.page < pages && (
            <Link href={qs({ page: String(res.page + 1) })} className="btn-secondary btn-sm">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
