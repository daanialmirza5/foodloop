import { requireUser } from "@/lib/session";
import { listUsers } from "@/lib/services/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DemoBadge, FilterTabs, PageHeader, Section, StatusBadge, Table, Td } from "@/components/ui";
import { ConfirmAction } from "@/components/forms";
import { CreateAdminForm } from "@/components/workflow-forms";
import { setUserStatusAction } from "@/lib/actions";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const me = await requireUser(["admin"]);
  const sp = await searchParams;
  const all = listUsers({ q: sp.q });
  const rows = all.filter((u) => !sp.role || u.role === sp.role);
  return (
    <>
      <PageHeader title="User management" subtitle="Suspend accounts that misuse the platform. Every decision needs a reason and is audit-logged." actions={<a href="/api/export/users" className="btn-secondary btn-sm">Export CSV</a>} />
      <form className="mb-4" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search name or email" className="input max-w-sm" aria-label="Search users" />
      </form>
      <FilterTabs basePath="/admin/users" param="role" active={sp.role ?? ""} tabs={[{ value: "", label: "All", count: all.length }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r], count: all.filter((u) => u.role === r).length }))]} />
      <Table head={["User", "Role", "City", "Joined", "Status", ""]}>
        {rows.map((u) => (
          <tr key={u.id}>
            <Td>
              <p className="font-semibold text-forest-900">
                {u.name} <DemoBadge show={u.is_demo} />
              </p>
              <p className="text-xs text-muted">{u.email}</p>
            </Td>
            <Td>{ROLE_LABELS[u.role as Role]}</Td>
            <Td>{u.city ?? "—"}</Td>
            <Td>{formatDate(u.created_at)}</Td>
            <Td>
              <StatusBadge status={u.status === "active" ? "verified" : "suspended"} label={u.status === "active" ? "Active" : "Suspended"} />
              {u.status_reason && <p className="mt-1 max-w-48 text-xs text-muted">{u.status_reason}</p>}
            </Td>
            <Td>
              {u.id !== me.id &&
                (u.status === "active" ? (
                  <ConfirmAction action={setUserStatusAction} fields={{ id: u.id, status: "suspended" }} label="Suspend" variant="danger" title={`Suspend ${u.name}?`} description="Their sessions end immediately and they can no longer sign in." reasonName="reason" confirmLabel="Suspend" />
                ) : (
                  <ConfirmAction action={setUserStatusAction} fields={{ id: u.id, status: "active" }} label="Reinstate" title={`Reinstate ${u.name}?`} reasonName="reason" confirmLabel="Reinstate" />
                ))}
            </Td>
          </tr>
        ))}
      </Table>
      <Section title="Create another administrator" className="mt-6" description="Administrator access can only be granted here (by an existing administrator) or with the create-admin CLI script — never through public sign-up.">
        <CreateAdminForm />
      </Section>
    </>
  );
}
