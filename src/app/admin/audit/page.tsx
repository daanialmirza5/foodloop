import { listAudit } from "@/lib/services/audit";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Table, Td } from "@/components/ui";

export const metadata = { title: "Audit log" };

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = listAudit(500).filter((a) => !q || `${a.action} ${a.entity_type} ${a.actor_name ?? ""} ${a.reason ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Audit log" subtitle="Important actions with who, what, when and why. Entries cannot be edited from the application." actions={<a href="/api/export/audit" className="btn-secondary btn-sm">Export CSV</a>} />
      <form method="get" className="mb-4">
        <input name="q" defaultValue={q} placeholder="Filter by action, actor or reason" className="input max-w-sm" aria-label="Filter audit log" />
      </form>
      <Table head={["When", "Actor", "Action", "Entity", "Reason"]}>
        {rows.map((a) => (
          <tr key={a.id}>
            <Td className="whitespace-nowrap text-xs">{formatDateTime(a.created_at)}</Td>
            <Td>
              {a.actor_name ?? <span className="text-muted">system</span>}
              {a.actor_role && <p className="text-xs text-muted">{a.actor_role}</p>}
            </Td>
            <Td className="font-mono text-xs">{a.action}</Td>
            <Td className="text-xs">
              {a.entity_type}
              {a.entity_id && <p className="font-mono text-muted">{a.entity_id}</p>}
            </Td>
            <Td className="max-w-xs text-xs">{a.reason ?? "—"}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
