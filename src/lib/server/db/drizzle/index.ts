import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import * as schema from './schema';

// Database path - use environment variable or default to data/calendar.db in project root
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data/calendar.db');

// Ensure the directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle client with schema
export const db = drizzle(sqlite, { schema });

// Export schema for use elsewhere
export { schema };

// Export the raw SQLite connection for migrations/schema updates
export { sqlite };

// Helper to generate IDs
export function generateId(): string {
	return crypto.randomUUID();
}

// Close database connection
export function closeDb(): void {
	sqlite.close();
}

// Re-export types
export type DrizzleClient = typeof db;
