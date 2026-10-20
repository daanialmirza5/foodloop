import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { getActor } from "@/lib/session";
import { isDemoMode } from "@/lib/utils";

export const metadata = { title: "Sign in" };

const REASONS: Record<string, { tone: "info" | "warning" | "success"; text: string }> = {
  signin: { tone: "info", text: "Please sign in to continue. If your session expired, sign in again." },
  suspended: { tone: "warning", text: "This account is suspended. Contact the FoodLoop team." },
  reset: { tone: "success", text: "Password updated. Please sign in with your new password." },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const sp = await searchParams;
  const actor = await getActor();
  if (actor && sp.reason !== "suspended") redirect(actor.role === "admin" ? "/admin" : "/dashboard");
  const reason = sp.reason ? REASONS[sp.reason] : null;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage donations, requests and deliveries."
      footer={
        <>
          New to FoodLoop?{" "}
          <Link href="/register" className="link">
            Create an account
          </Link>
          {isDemoMode() && (
            <>
              {" "}
              ·{" "}
              <Link href="/demo" className="link">
                Use a demo account
              </Link>
            </>
          )}
        </>
      }
    >
      {reason && (
        <Alert tone={reason.tone} className="mb-4">
          {reason.text}
        </Alert>
      )}
      <LoginForm next={sp.next} />
    </AuthShell>
  );
}
