import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { statusLabel, statusTone } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/format";

const TONES = {
  green: "bg-forest-50 text-forest-700 ring-forest-200",
  amber: "bg-saffron-100 text-saffron-700 ring-saffron-400/40",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  gray: "bg-stone-100 text-stone-600 ring-stone-200",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[statusTone(status)], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label ?? statusLabel(status)}
    </span>
  );
}

export function Pill({ children, tone = "gray", className }: { children: ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>{children}</span>;
}

/** Marks fictional demonstration data everywhere it is shown. */
export function DemoBadge({ show = true }: { show?: boolean | number }) {
  if (!show) return null;
  return (
    <span title="Fictional demonstration record" className="inline-flex items-center rounded-md border border-dashed border-saffron-500 bg-saffron-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-saffron-700">
      DEMO
    </span>
  );
}

export function PageHeader({ title, subtitle, eyebrow, actions }: { title: string; subtitle?: ReactNode; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold text-forest-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "forest" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "forest" | "saffron" | "leaf" | "stone" }) {
  const toneCls = { forest: "bg-forest-50 text-forest-700", saffron: "bg-saffron-100 text-saffron-700", leaf: "bg-leaf-100 text-leaf-600", stone: "bg-stone-100 text-stone-600" }[tone];
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className={cn("grid size-9 place-items-center rounded-xl", toneCls)}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-forest-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-forest-50 text-forest-600">{icon}</div>}
      <p className="font-semibold text-forest-900">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "error"; title?: string; children?: ReactNode; className?: string }) {
  const map = {
    info: { cls: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
    success: { cls: "border-forest-200 bg-forest-50 text-forest-900", Icon: CheckCircle2 },
    warning: { cls: "border-saffron-400/50 bg-saffron-100 text-saffron-700", Icon: AlertTriangle },
    error: { cls: "border-red-200 bg-red-50 text-red-800", Icon: XCircle },
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", map.cls, className)}>
      <map.Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function Section({ title, description, children, actions, className }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-base font-semibold text-forest-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ items }: { items: { id: string; to_status: string; from_status: string | null; note: string | null; created_at: string; actor_name: string | null }[] }) {
  if (!items.length) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-forest-100 pl-5">
      {items.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-white bg-forest-500 ring-2 ring-forest-100" aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.to_status} />
            <span className="text-xs text-muted">{formatDateTime(h.created_at)}</span>
          </div>
          {(h.note || h.actor_name) && (
            <p className="mt-1 text-sm text-ink/80">
              {h.note}
              {h.actor_name && <span className="text-muted"> — {h.actor_name}</span>}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/5 bg-sand/60 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">{children}</tbody>
        </table>
      </div>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function FilterTabs({ tabs, active, basePath, param = "status" }: { tabs: { value: string; label: string; count?: number }[]; active: string; basePath: string; param?: string }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-sand/70 p-1" aria-label="Filter">
      {tabs.map((t) => {
        const href = t.value ? `${basePath}?${param}=${t.value}` : basePath;
        const on = active === t.value;
        return (
          <Link key={t.value || "all"} href={href} aria-current={on ? "page" : undefined} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition", on ? "bg-white text-forest-800 shadow-sm" : "text-muted hover:text-forest-800")}>
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-xs text-muted">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function UrgencyBadge({ deadline }: { deadline: string }) {
  const hours = (new Date(deadline).getTime() - Date.now()) / 36e5;
  if (hours <= 0) return <Pill tone="red">Deadline passed</Pill>;
  if (hours <= 2) return <Pill tone="red">Critical · under 2 h</Pill>;
  if (hours <= 6) return <Pill tone="amber">Urgent · under 6 h</Pill>;
  return null;
}
