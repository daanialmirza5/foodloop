/**
 * The ONLY bootstrap path for an administrator account (public sign-up can never grant admin).
 * Usage: npm run create-admin -- admin@example.org "Full Name" "StrongPassw0rd"
 */
import { loadEnv } from "./env";
loadEnv();

(async () => {
  const { registerUser } = await import("../src/lib/auth");
  const { audit } = await import("../src/lib/services/audit");
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('Usage: npm run create-admin -- <email> "<full name>" "<password>"');
    process.exit(1);
  }
  try {
    const u = registerUser({ email, name, password, role: "admin" }, { allowAdmin: true });
    audit(null, "user.create_admin_cli", "user", u.id, "Created via scripts/create-admin.ts");
    console.log(`✔ Administrator created: ${u.email}`);
  } catch (e) {
    console.error("✖", (e as Error).message);
    process.exit(1);
  }
})();
