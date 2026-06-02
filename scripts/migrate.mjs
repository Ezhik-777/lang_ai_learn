#!/usr/bin/env node
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FATAL: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

try {
  console.log("→ applying database migrations…");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  console.log("✓ migrations applied");
  await pool.end();
  process.exit(0);
} catch (err) {
  console.error("migration failed:", err);
  await pool.end();
  process.exit(1);
}
