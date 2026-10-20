import Link from "next/link";
import { PageHeader, Section } from "@/components/ui";

export const metadata = { title: "About" };

export default function About() {
  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader eyebrow="About FoodLoop" title="Rescue Food. Share Hope. Feed Communities." subtitle="Every meal deserves a chance to make a difference." />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/volunteers.jpg" alt="Volunteers in gloves unloading boxes of food" className="mb-8 aspect-[21/9] w-full rounded-3xl object-cover" />
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Why FoodLoop exists">
          <p className="text-sm text-ink/75">
            Good food is regularly thrown away after weddings, celebrations and everyday service, while shelters and community kitchens nearby work to feed people. FoodLoop is a coordination platform that connects the two quickly, safely and transparently — with a record at every step.
          </p>
        </Section>
        <Section title="What we believe">
          <ul className="space-y-2 text-sm text-ink/75">
            <li>• Safety matters more than donation numbers.</li>
            <li>• Impact should be counted only when it is confirmed.</li>
            <li>• Recipients deserve dignity — we never collect beneficiaries’ personal data.</li>
            <li>• Money should be traceable from payment to disbursement.</li>
          </ul>
        </Section>
        <Section title="Project status" className="md:col-span-2">
          <p className="text-sm text-ink/75">
            FoodLoop is a student social-impact project demonstrated as a working prototype. It is not a registered charity, does not hold FSSAI registration for food handling, and has no confirmed partner organisations. All organisations, people and transactions shown in demonstration mode are fictional and labelled <strong>DEMO</strong>. See the{" "}
            <Link href="/food-safety" className="link">
              food-safety
            </Link>
            ,{" "}
            <Link href="/privacy" className="link">
              privacy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="link">
              terms
            </Link>{" "}
            pages for what a real launch would require.
          </p>
        </Section>
      </div>
    </div>
  );
}
