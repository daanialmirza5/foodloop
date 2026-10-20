import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" footer={<Link href="/login" className="link">Back to sign in</Link>}>
      {token ? <ResetForm token={token} /> : <Alert tone="error">This reset link is missing its token. Request a new one.</Alert>}
    </AuthShell>
  );
}
