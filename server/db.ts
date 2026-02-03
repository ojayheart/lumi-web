import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create a database connection using the environment variable
const connectionString = process.env.DATABASE_URL!;
console.log("Connecting to database with URL:", connectionString.replace(/:[^:]*@/, ':***@')); // Hide password

// Create a postgres client with explicit settings for reliability
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close connections after 20 seconds of inactivity
  connect_timeout: 10, // Try to connect for 10 seconds
  prepare: false, // Don't use prepared statements
});

// Create and export the Drizzle ORM instance
export const db = drizzle(client);