import Link from "next/link";
import { Building2, Clock, MapPin, Phone } from "lucide-react";
import { publicDirectory } from "@/lib/services/organizations";
import { all } from "@/lib/db";
import { DemoBadge, EmptyState, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Find food support" };

export default async function FindSupport({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city } = await searchParams;
  const orgs = publicDirectory(city || undefined);
  const cities = all<{ city: string }>("SELECT DISTINCT city FROM organizations WHERE kind = 'recipient' AND verification_status = 'verified' AND city IS NOT NULL ORDER BY city").map((c) => c.city);
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Need food?" title="Find food support near you" subtitle="FoodLoop delivers rescued food to verified community kitchens, shelters and NGOs, who serve people directly. You don’t need an account and we never ask for your personal details." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <form className="card mb-4 flex flex-wrap gap-3 p-4" method="get">
            <label htmlFor="city" className="sr-only">
              City
            </label>
            <select id="city" name="city" defaultValue={city ?? ""} className="input max-w-xs">
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="btn-primary">Show organisations</button>
          </form>
          {orgs.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {orgs.map((o) => (
                <li key={o.id} className="card p-5">
                  <p className="flex items-center gap-2 font-semibold text-forest-900">
                    <Building2 className="size-4 text-forest-600" /> {o.name} <DemoBadge show={o.is_demo} />
                  </p>
                  <p className="text-xs text-muted">{o.org_type}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted" /> {o.service_area ?? o.city}
                  </p>
                  {o.operating_hours && (
                    <p className="mt-1 flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-muted" /> {o.operating_hours}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">{o.food_preference === "veg_only" ? "Serves vegetarian food" : "Serves vegetarian & non-vegetarian food"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No verified organisations listed here yet" body="Try another city. FoodLoop only lists organisations an administrator has verified." />
          )}
          <p className="mt-4 text-xs text-muted">Contact details are shared by organisations directly. FoodLoop does not guarantee availability of meals at any organisation.</p>
        </div>
        <div className="space-y-6">
          <Section title="In an emergency">
            <p className="flex items-start gap-2 text-sm text-ink/80">
              <Phone className="mt-0.5 size-4 shrink-0" /> If you or someone near you is in immediate danger or medical need, call <strong>112</strong> (India emergency number).
            </p>
          </Section>
          <Section title="Run a shelter, kitchen or NGO?">
            <p className="text-sm text-ink/75">Register to receive rescued and donated food. Tell us your capacity, storage and service area; an administrator verifies you before you can request food.</p>
            <Link href="/register?role=ngo" className="btn-primary mt-4">
              Register your organisation
            </Link>
          </Section>
        </div>
      </div>
    </div>
  );
}
