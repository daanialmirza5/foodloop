import Link from "next/link";
import { PageHeader, Section, StatusBadge } from "@/components/ui";

export const metadata = { title: "How it works" };

const STEPS = [
  ["Donor registers", "Restaurants, caterers, event organisers and individuals create a donor account.", "—"],
  ["Food listing created", "Title, category, quantity & weight, preparation time, storage & temperature, packaging, allergens, pickup window and deadline.", "draft"],
  ["Automated safety screening", "Time–temperature, packaging, allergen, expiry and declaration checks. Failures are rejected immediately with reasons.", "pending_review"],
  ["Coordinator approval", "A coordinator confirms a manual checklist. Only then is the food visible to NGOs.", "available"],
  ["Recipient discovery", "Verified NGOs browse or are alerted; matching checks distance, capacity, diet, cold storage and deadline.", "available"],
  ["Recipient request", "An eligible NGO requests the food and chooses volunteer, own-transport or donor delivery.", "request_received"],
  ["Request approval", "The donor (or coordinator) accepts. Capacity and deadline are re-checked; other requests are declined.", "accepted"],
  ["Pickup scheduling & volunteer", "A volunteer claims the task — only one can — or a coordinator assigns one.", "pickup_scheduled"],
  ["Collection confirmation", "The volunteer confirms a pickup safety checklist and records the kg collected. Failing the checklist blocks the food.", "collected"],
  ["Delivery & acknowledgement", "The volunteer records handover; the NGO confirms the kg received and the condition — or refuses unsafe food.", "delivered"],
  ["Impact reporting", "Only the recipient-confirmed quantity counts as delivered. Offered, accepted, collected and delivered are tracked separately.", "—"],
];

export default function HowItWorks() {
  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader eyebrow="The FoodLoop workflow" title="How FoodLoop works" subtitle="One shared workflow for everyday surplus, planned fresh donations and wedding & event rescue. Every status change is enforced on the server and recorded with who made it and when." />
      <ol className="space-y-3">
        {STEPS.map(([t, d, s], i) => (
          <li key={t} className="card flex gap-4 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-forest-700 text-sm font-bold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-forest-900">{t}</p>
                {s !== "—" && <StatusBadge status={s} />}
              </div>
              <p className="mt-1 text-sm text-ink/75">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Section title="Wedding & event rescue">
          <p className="text-sm text-ink/75">
            Events move through <StatusBadge status="registered" /> → <StatusBadge status="awaiting_confirmation" /> → <StatusBadge status="awaiting_food" /> → <StatusBadge status="ready_for_collection" /> → <StatusBadge status="collection_arranged" /> → <StatusBadge status="completed" />. An event only becomes “ready” once real leftover food has been registered and approved — never because it was registered.
          </p>
          <Link href="/events" className="link mt-3 inline-block text-sm">
            Event Food Rescue →
          </Link>
        </Section>
        <Section title="When things go wrong">
          <ul className="space-y-2 text-sm text-ink/75">
            <li>• Deadline passes before pickup → donation <StatusBadge status="expired" />, missed pickups recorded.</li>
            <li>• Volunteer can’t make it → release task or record a missed pickup; a coordinator re-arranges collection.</li>
            <li>• Safety concern → high-severity report puts food on hold; a coordinator releases or rejects it.</li>
            <li>• No suitable recipient → donor and coordinators are told clearly; nothing is reported as rescued.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
