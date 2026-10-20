import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/volunteers.jpg" alt="" className="h-[520px] w-full rounded-3xl object-cover shadow-[var(--shadow-lift)]" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-forest-900">{title}</h1>
        {subtitle && <div className="mt-2 text-sm text-muted">{subtitle}</div>}
        <div className="card mt-6 p-6">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
