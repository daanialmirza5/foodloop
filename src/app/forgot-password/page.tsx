import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter the email you registered with." footer={<Link href="/login" className="link">Back to sign in</Link>}>
      <Alert tone="info" className="mb-4">
        Email delivery is not configured in this build. In demo mode the reset link is shown on screen instead of being emailed.
      </Alert>
      <ForgotForm />
    </AuthShell>
  );
}
