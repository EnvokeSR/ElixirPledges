import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from "./vite";

// Configure neon to use WebSocket
neonConfig.webSocketConstructor = ws;

// Ensure database URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

log("Initializing database connection with URL:", process.env.DATABASE_URL.split("@")[1]); // Only log the host part

// Create connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20, // Maximum number of clients in the pool
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export a function to test database connection
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    log("Database connection test successful");
    return result.rows[0];
  } catch (error) {
    log("Database connection test failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Add connection error handler
pool.on('error', (err) => {
  log("Unexpected database pool error:", err.message);
});