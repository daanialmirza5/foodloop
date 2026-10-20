import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export const metadata = { title: "Permission denied" };

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const { need } = await searchParams;
  const roles = (need ?? "").split(",").filter(Boolean) as Role[];
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-4 font-display text-3xl font-semibold text-forest-900">You don’t have access to this page</h1>
      <p className="mt-2 max-w-md text-muted">{roles.length ? `This area is for: ${roles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}.` : "Your account role does not allow this action."} Access is checked on the server for every request.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn-primary">
          Go to my dashboard
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
