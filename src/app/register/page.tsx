import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Get started" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <AuthShell
      title="Join FoodLoop"
      subtitle="Create your account. You can add your organisation details right after."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm role={role} />
    </AuthShell>
  );
}
