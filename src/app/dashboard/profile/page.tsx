import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getUserById } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DemoBadge, KeyValue, PageHeader, Section } from "@/components/ui";
import { ProfileForm } from "@/components/org-forms";

export const metadata = { title: "Profile & settings" };

export default async function Profile() {
  const actor = await requireUser(undefined, "/dashboard/profile");
  const u = getUserById(actor.id)!;
  return (
    <>
      <PageHeader title="Profile & settings" />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Your details">
          <ProfileForm defaults={{ name: u.name, phone: u.phone, city: u.city }} />
        </Section>
        <Section title="Account">
          <KeyValue
            items={[
              ["Email", u.email],
              ["Role", <>{ROLE_LABELS[u.role]} <DemoBadge show={u.is_demo} /></>],
              ["Member since", formatDate(u.created_at)],
              ["Password", <Link key="pw" href="/forgot-password" className="link">Reset password</Link>],
            ]}
          />
          <p className="mt-4 text-xs text-muted">Roles are fixed at registration. Administrator access is granted only by an existing administrator.</p>
        </Section>
      </div>
    </>
  );
}
