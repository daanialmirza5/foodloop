"use client";

import { ActionForm, ConfirmAction, SubmitButton } from "@/components/forms";
import { demoLoginAction, resetDemoAction } from "@/lib/actions";

export function DemoLoginButton({ email, disabled }: { email: string; disabled?: boolean }) {
  if (disabled) return <button className="btn-secondary btn-sm" disabled>Sign in</button>;
  return (
    <ActionForm action={demoLoginAction}>
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="secondary" className="btn-sm" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}

export function ResetDemoButton() {
  return (
    <ConfirmAction
      action={resetDemoAction}
      fields={{}}
      label="Reset demo data"
      variant="danger"
      size="md"
      title="Reset all demo data?"
      description="This deletes every record in the local database (including anything you created) and reloads the fictional demo scenario. You will be signed out."
      confirmLabel="Reset now"
    />
  );
}
