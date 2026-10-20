import { Alert, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Terms of use" subtitle="Draft for a student prototype." />
      <Alert tone="warning" title="Legal review required" className="mb-6">
        Placeholder terms for demonstration. They have not been reviewed by a lawyer and must be before FoodLoop handles real food or money.
      </Alert>
      <div className="space-y-4">
        <Section title="The service">
          <p className="text-sm text-ink/80">FoodLoop is a coordination platform connecting food donors, recipient organisations and volunteers. FoodLoop does not prepare, store, inspect, own or transport food itself.</p>
        </Section>
        <Section title="Your responsibilities">
          <ul className="space-y-1 text-sm text-ink/80">
            <li>• Donors must provide accurate, honest information about food, preparation, storage and allergens, and comply with applicable food-safety law.</li>
            <li>• Recipient organisations must inspect food on arrival and refuse anything unsafe.</li>
            <li>• Volunteers must follow hygiene guidance and must not transport food that fails the pickup checklist.</li>
            <li>• You must not create accounts for others or attempt to gain administrator access.</li>
          </ul>
        </Section>
        <Section title="No guarantees, no legal protection">
          <p className="text-sm text-ink/80">FoodLoop does not guarantee that food is safe, that a recipient will be found, or that a collection will happen. Using FoodLoop does not give any participant legal protection or liability cover.</p>
        </Section>
        <Section title="Money">
          <p className="text-sm text-ink/80">In demonstration mode, payments are simulated and no money moves. FoodLoop does not offer tax benefits. Accepting real donations requires a properly registered organisation, applicable financial and legal compliance, and a configured payment gateway.</p>
        </Section>
      </div>
    </div>
  );
}
