"use client";

import { useState } from "react";
import { ActionForm, Checkbox, Input, Select, SubmitButton } from "./forms";
import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction } from "@/lib/actions";
import Link from "next/link";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="link">
          Forgot password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}

const ROLE_OPTIONS = [
  { value: "donor", label: "Food donor — restaurant, caterer, event organiser, individual" },
  { value: "ngo", label: "NGO / recipient organisation — shelter, community kitchen" },
  { value: "volunteer", label: "Volunteer — collect and deliver food" },
  { value: "supporter", label: "Individual supporter — fund meals" },
];

export function RegisterForm({ role }: { role?: string }) {
  const [r, setR] = useState(role && ROLE_OPTIONS.some((o) => o.value === role) ? role : "donor");
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <Select label="I want to join as" name="role" required options={ROLE_OPTIONS} value={r} onChange={(e) => setR(e.target.value)} hint="Administrator access is assigned only by the FoodLoop team." />
      <Input label={r === "ngo" ? "Your name (authorised contact)" : "Full name"} name="name" autoComplete="name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" placeholder="+91 98xxx xxxxx" />
      </div>
      <Input label="City" name="city" autoComplete="address-level2" placeholder="e.g. Bengaluru" />
      <Input label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters with a letter and a number." />
      <Checkbox
        name="accept_terms"
        required
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="link" target="_blank">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link" target="_blank">
              privacy policy
            </Link>
            .
          </>
        }
      />
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </ActionForm>
  );
}

export function ForgotForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4">
      <Input label="Email" name="email" type="email" required />
      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  return (
    <ActionForm action={resetPasswordAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Input label="New password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <Input label="Confirm new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      <SubmitButton className="w-full">Set new password</SubmitButton>
    </ActionForm>
  );
}
