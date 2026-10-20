import Link from "next/link";
import { getSetting } from "@/lib/db";
import { safetyRules } from "@/lib/services/listings";
import { paymentMode } from "@/lib/services/payments";
import { isDemoMode } from "@/lib/utils";
import { KeyValue, PageHeader, Section } from "@/components/ui";
import { SettingsForm } from "@/components/workflow-forms";

export const metadata = { title: "Platform settings" };

export default function Settings() {
  return (
    <>
      <PageHeader title="Platform settings" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Food-safety thresholds" description="Used by automated screening. FoodLoop refuses values less strict than its minimum rules.">
          <SettingsForm rules={safetyRules()} kgPerMeal={Number(getSetting("kg_per_meal", "0.4"))} />
        </Section>
        <div className="space-y-6">
          <Section title="Integrations">
            <KeyValue
              items={[
                ["Mode", isDemoMode() ? "DEMO_MODE=true" : "Production (demo disabled)"],
                ["Payments", paymentMode()],
                ["Webhook secret", process.env.RAZORPAY_WEBHOOK_SECRET ? "Configured" : "Not configured"],
                ["Email / WhatsApp", "Not configured — in-app notifications only"],
                ["Database", process.env.DATABASE_FILE || "./data/foodloop.db"],
              ]}
            />
          </Section>
          {isDemoMode() && (
            <Section title="Demo data">
              <p className="text-sm text-muted">Reset and reload fictional demo data from the demo page.</p>
              <Link href="/demo" className="btn-secondary btn-sm mt-3">
                Open demo controls
              </Link>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
