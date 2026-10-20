import { Alert, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Privacy policy" subtitle="Draft for a student prototype." />
      <Alert tone="warning" title="Legal review required" className="mb-6">
        This is a placeholder policy describing how this prototype handles data. Before any real launch it must be reviewed by a qualified lawyer, including against India’s Digital Personal Data Protection Act, 2023 and its rules.
      </Alert>
      <div className="space-y-4">
        <Section title="What we collect">
          <ul className="space-y-1 text-sm text-ink/80">
            <li>• Account details: name, email, optional phone and city, and your role.</li>
            <li>• Organisation details for donors and NGOs, including verification documents (stored privately).</li>
            <li>• Donation records: food details, pickup location and contact, status history.</li>
            <li>• Volunteer service areas and availability.</li>
            <li>• Contribution records: amount, programme, name and email. Card / UPI / bank details are entered only on the payment provider’s checkout and never reach FoodLoop.</li>
          </ul>
        </Section>
        <Section title="What we deliberately do not collect">
          <p className="text-sm text-ink/80">We do not collect names, photos, addresses or any personal data about the people who eat the food. NGOs report only an approximate number of people served.</p>
        </Section>
        <Section title="Who can see what">
          <ul className="space-y-1 text-sm text-ink/80">
            <li>• Exact pickup addresses and contact numbers are visible only to the donor, the accepted recipient organisation, the assigned volunteer and administrators.</li>
            <li>• Verification documents are visible only to the organisation and administrators.</li>
            <li>• Public pages show aggregated impact, and verified organisations’ names, areas and hours.</li>
          </ul>
        </Section>
        <Section title="Retention, security & your choices">
          <p className="text-sm text-ink/80">Passwords are stored as salted scrypt hashes; sessions use HTTP-only cookies. Important actions are recorded in an audit log for accountability. Placeholder retention: donation records kept for traceability for a period to be defined by legal review; account deletion requests handled by the administrator. Contact: [administrator email to be added].</p>
        </Section>
      </div>
    </div>
  );
}
