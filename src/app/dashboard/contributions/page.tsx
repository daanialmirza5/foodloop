import Link from "next/link";
import { Wallet } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listDonations } from "@/lib/services/payments";
import { formatDateTime, formatInr } from "@/lib/format";
import { DemoBadge, EmptyState, PageHeader, StatusBadge, Table, Td } from "@/components/ui";

export const metadata = { title: "My contributions" };

export default async function Contributions() {
  const actor = await requireUser(undefined, "/dashboard/contributions");
  const rows = listDonations({ userId: actor.id });
  return (
    <>
      <PageHeader title="Monetary contributions" subtitle="Your transaction history. Simulated demo payments are labelled and involve no real money." actions={<Link href="/donate-money" className="btn-primary">New contribution</Link>} />
      {rows.length ? (
        <Table head={["Reference", "Programme", "Amount", "Mode", "Status", "Date", ""]}>
          {rows.map((d) => (
            <tr key={d.id}>
              <Td className="font-mono text-xs">{d.code}</Td>
              <Td>{d.program_title ?? "General fund"}</Td>
              <Td className="font-semibold">{formatInr(d.amount_paise)}</Td>
              <Td>{d.mode === "simulated" ? <DemoBadge /> : d.mode}</Td>
              <Td>
                <StatusBadge status={d.status} />
              </Td>
              <Td>{formatDateTime(d.created_at)}</Td>
              <Td>
                <Link href={`/donate-money/receipt/${d.id}`} className="link text-xs">
                  Receipt
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState icon={<Wallet className="size-5" />} title="No contributions yet" action={<Link href="/donate-money" className="btn-primary">Fund meals</Link>} />
      )}
    </>
  );
}
