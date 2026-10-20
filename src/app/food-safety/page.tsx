import { DEFAULT_SAFETY_RULES } from "@/lib/safety";
import { safetyRules } from "@/lib/services/listings";
import { PICKUP_CHECKS } from "@/lib/safety";
import { Alert, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Food safety" };

export default function FoodSafety() {
  const r = safetyRules();
  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeader eyebrow="Food safety & responsibility" title="Safety matters more than numbers" subtitle="How FoodLoop decides whether donated food can be redistributed." />
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Food we can accept">
          <ul className="space-y-2 text-sm text-ink/80">
            <li>✓ Cooked food kept hot at {r.hotHeldMinTempC}°C or above, collected within {r.hotHeldMaxHours} hours of preparation</li>
            <li>✓ Cooked food chilled at {r.coldMaxTempC}°C or below, within {r.refrigeratedMaxHours} hours of preparation</li>
            <li>✓ Cooked food at room temperature for no more than {r.ambientMaxHours} hours (preparation to deadline)</li>
            <li>✓ Packaged food and groceries in intact packaging, before their expiry / best-before date</li>
            <li>✓ Fresh bakery items, fruit and vegetables in good condition</li>
          </ul>
        </Section>
        <Section title="Food we always reject">
          <ul className="space-y-2 text-sm text-ink/80">
            <li>✗ Food served on guests’ plates or partially eaten</li>
            <li>✗ Ready-to-eat food left uncovered or with unknown storage history</li>
            <li>✗ Damaged, leaking or opened packaging (for ready-to-eat / packaged food)</li>
            <li>✗ Food past its expiry date, or that expires before collection</li>
            <li>✗ Food without a declared allergen statement</li>
            <li>✗ Anything that fails the pickup or delivery check</li>
          </ul>
        </Section>
        <Section title="Four checkpoints" className="md:col-span-2">
          <ol className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-xl bg-sand/60 p-4">
              <p className="font-semibold text-forest-900">1. Automated screening</p>
              <p className="mt-1 text-ink/75">Rules check time, temperature, packaging, allergens, expiry and donor declarations.</p>
            </li>
            <li className="rounded-xl bg-sand/60 p-4">
              <p className="font-semibold text-forest-900">2. Coordinator review</p>
              <p className="mt-1 text-ink/75">A person confirms a manual checklist before anything is published.</p>
            </li>
            <li className="rounded-xl bg-sand/60 p-4">
              <p className="font-semibold text-forest-900">3. Pickup check</p>
              <p className="mt-1 text-ink/75">{PICKUP_CHECKS.map((c) => c.label).join("; ")}.</p>
            </li>
            <li className="rounded-xl bg-sand/60 p-4">
              <p className="font-semibold text-forest-900">4. Recipient acknowledgement</p>
              <p className="mt-1 text-ink/75">The receiving organisation confirms condition and quantity, or refuses the food.</p>
            </li>
          </ol>
          <p className="mt-4 text-sm text-ink/75">Any participant can report an incident. A high-severity safety report puts the donation on hold until a coordinator releases or rejects it. Every step is traceable through the donation’s tracking ID.</p>
        </Section>
        <Section title="Where these rules come from">
          <p className="text-sm text-ink/75">
            The thresholds above are FoodLoop’s operating rules, based on widely published food-safety principles (for example the World Health Organization’s “Five Keys to Safer Food”: keep hot food above 60°C, keep cold food below 5°C, don’t leave cooked food at room temperature for more than about 2 hours). Administrators can make them stricter. They are not a statement of Indian law.
          </p>
          <p className="mt-3 text-sm text-ink/75">
            Donors and recipients should consult official guidance from the Food Safety and Standards Authority of India (FSSAI), including its resources on surplus-food distribution, at{" "}
            <a href="https://www.fssai.gov.in" className="link" target="_blank" rel="noreferrer">
              fssai.gov.in
            </a>
            .
          </p>
          {JSON.stringify(r) !== JSON.stringify(DEFAULT_SAFETY_RULES) && <p className="mt-3 text-xs text-muted">This deployment uses customised thresholds set by an administrator.</p>}
        </Section>
        <Section title="Hygiene for volunteers">
          <ul className="space-y-2 text-sm text-ink/80">
            <li>• Wash hands; use clean gloves when handling containers.</li>
            <li>• Use clean, insulated boxes; keep hot and cold food separate.</li>
            <li>• Go straight from pickup to the recipient — no detours.</li>
            <li>• If anything looks, smells or feels wrong, don’t move the food — report it.</li>
          </ul>
        </Section>
      </div>
      <Alert tone="warning" title="Safety disclaimer" className="mt-8">
        <span id="disclaimer">
          FoodLoop coordinates food donations and keeps records. It does not inspect kitchens, does not take legal custody of food, and does not replace appropriate handling, safety checks, licensing or legal compliance by donors, volunteers and recipient organisations. FoodLoop does not provide any donor with automatic legal protection.
        </span>
      </Alert>
    </div>
  );
}
