import { listDisbursements, listDonations, listPrograms, paymentMode } from "@/lib/services/payments";
import { formatDateTime, formatInr } from "@/lib/format";
import { Alert, DemoBadge, FilterTabs, PageHeader, Section, StatCard, StatusBadge, Table, Td } from "@/components/ui";
import { ConfirmAction } from "@/components/forms";
import { DisburseForm } from "@/components/workflow-forms";
import { refundAction } from "@/lib/actions";
import Link from "next/link";

export const metadata = { title: "Payments & funds" };

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const all = listDonations();
  const rows = all.filter((d) => !status || d.status === status);
  const programs = listPrograms(false);
  const disb = listDisbursements();
  const mode = paymentMode();
  const sum = (f: (d: (typeof all)[number]) => boolean) => all.filter(f).reduce((s, d) => s + d.amount_paise, 0);
  return (
    <>
      <PageHeader title="Payment transactions & financial transparency" actions={<a href="/api/export/payments" className="btn-secondary btn-sm">Export CSV</a>} />
      <Alert tone={mode === "live" ? "info" : "warning"} className="mb-6" title={`Payment mode: ${mode.toUpperCase()}`}>
        {mode === "simulated" ? "No gateway keys configured — all transactions are simulated and no money moves." : mode === "sandbox" ? "Razorpay test keys — sandbox money only." : "Live Razorpay keys. Ensure legal & financial requirements are met."}
      </Alert>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Provider-confirmed" value={formatInr(sum((d) => d.status === "succeeded" && d.mode !== "simulated"))} />
        <StatCard label="Simulated successful" value={formatInr(sum((d) => d.status === "succeeded" && d.mode === "simulated"))} tone="stone" />
        <StatCard label="Refunded" value={formatInr(sum((d) => d.status === "refunded"))} tone="saffron" />
        <StatCard label="Disbursed (recorded)" value={formatInr(disb.reduce((s, d) => s + d.amount_paise, 0))} tone="leaf" />
      </div>
      <FilterTabs basePath="/admin/payments" active={status} tabs={[{ value: "", label: "All", count: all.length }, ...["pending", "succeeded", "failed", "cancelled", "refunded"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: all.filter((d) => d.status === s).length }))]} />
      <Table head={["Reference", "Donor", "Programme", "Amount", "Mode", "Status", "Created", ""]}>
        {rows.map((d) => (
          <tr key={d.id}>
            <Td>
              <Link href={`/donate-money/receipt/${d.id}`} className="font-mono text-xs hover:underline">
                {d.code}
              </Link>
            </Td>
            <Td>
              {d.donor_name}
              <p className="text-xs text-muted">{d.donor_email}</p>
            </Td>
            <Td>{d.program_title ?? "General"}</Td>
            <Td className="font-semibold">{formatInr(d.amount_paise)}</Td>
            <Td>{d.mode === "simulated" ? <DemoBadge /> : d.mode}</Td>
            <Td>
              <StatusBadge status={d.status} />
            </Td>
            <Td>{formatDateTime(d.created_at)}</Td>
            <Td>{d.status === "succeeded" && <ConfirmAction action={refundAction} fields={{ id: d.id }} label="Refund" variant="danger" title={`Refund ${d.code}?`} description={d.mode === "simulated" ? "Simulated refund — recorded immediately." : "Requests a refund from Razorpay. Status changes to Refunded when the signed webhook confirms it."} reasonName="reason" confirmLabel="Refund" />}</Td>
          </tr>
        ))}
      </Table>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Section title="Record a disbursement" description="Only record money actually transferred to a programme. Cannot exceed confirmed, unrefunded funds.">
          <DisburseForm programs={programs.map((p) => ({ id: p.id, title: p.title }))} />
        </Section>
        <Section title="Programme ledger">
          <Table head={["Programme", "Confirmed", "Disbursed", "Available"]}>
            {programs.map((p) => (
              <tr key={p.id}>
                <Td>
                  {p.title} <DemoBadge show={p.is_demo} />
                </Td>
                <Td>{formatInr(p.raised_paise)}</Td>
                <Td>{formatInr(p.disbursed_paise)}</Td>
                <Td className="font-semibold">{formatInr(p.raised_paise - p.disbursed_paise)}</Td>
              </tr>
            ))}
          </Table>
          <ul className="mt-4 space-y-2 text-sm">
            {disb.map((x) => (
              <li key={x.id} className="text-xs text-muted">
                {formatDateTime(x.created_at)} · {x.program_title} · {formatInr(x.amount_paise)} — {x.description} ({x.recorder}) <DemoBadge show={x.is_demo} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
