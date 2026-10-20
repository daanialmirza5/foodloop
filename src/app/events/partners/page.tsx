import { PageHeader, Section } from "@/components/ui";
import { PartnerForm } from "@/components/event-forms";

export const metadata = { title: "Venue & caterer partnerships" };

export default function PartnersPage() {
  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader eyebrow="Event partners" title="Wedding planners, caterers & venues" subtitle="Marriage halls, banquet halls, hotels, caterers and event companies can register interest in recurring food-rescue arrangements. Every partnership is subject to verification and a signed agreement." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Register interest">
          <PartnerForm />
        </Section>
        <Section title="What partnership involves">
          <ul className="space-y-3 text-sm text-ink/80">
            <li>• A named contact who registers events and reports actual surplus after each function.</li>
            <li>• Kitchen practices that keep food hot or chilled and packed in covered containers.</li>
            <li>• Agreed collection windows and access for volunteers.</li>
            <li>• Periodic review of safety incidents and delivery records.</li>
          </ul>
          <p className="mt-4 text-xs text-muted">FoodLoop never displays a business as a partner until an administrator records a signed agreement.</p>
        </Section>
      </div>
    </div>
  );
}
