import { loadEnv } from "./env";
loadEnv();

(async () => {
  const { getDb } = await import("../src/lib/db");
  getDb();
  console.log(`✔ Schema applied to ${process.env.DATABASE_FILE || "./data/foodloop.db"}`);
})();
