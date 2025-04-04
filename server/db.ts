import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create a pool for storing session data
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// For drizzle ORM operations
const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });
