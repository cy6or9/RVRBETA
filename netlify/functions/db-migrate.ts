// netlify/functions/db-migrate.ts
import type { Handler } from "@netlify/functions";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export const handler: Handler = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL missing in environment");
    }

    console.log("⏳ Running Drizzle migrations on Neon…");

    // Neon SQL client
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    // Run migrations from compiled output folder
    await migrate(db, { migrationsFolder: "migrations" });

    console.log("✅ Drizzle migration complete.");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Migrations complete." }),
    };
  } catch (err: any) {
    console.error("❌ Migration error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
