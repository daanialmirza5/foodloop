import { loadEnv } from "./env";
loadEnv();

(async () => {
  const { seedDemo, DEMO_ACCOUNTS, DEMO_PASSWORD } = await import("../src/lib/seed");
  const res = await seedDemo();
  console.log(`\n✔ FoodLoop demo data loaded (${res.users} demo accounts). All records are fictional and labelled DEMO.`);
  console.log(`  Database: ${process.env.DATABASE_FILE || "./data/foodloop.db"}`);
  console.log(`  Password for every demo account: ${DEMO_PASSWORD}\n`);
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.email.padEnd(28)} ${a.label}`);
  console.log("\nOpen listings use deadlines relative to now — reset again shortly before presenting.\n");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
