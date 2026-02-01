import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

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

// Initialize schema - try multiple locations for schema.sql
const schemaPaths = [
	process.env.SCHEMA_PATH,
	join(process.cwd(), 'schema.sql'),
	'/app/schema.sql'
].filter(Boolean) as string[];

for (const schemaPath of schemaPaths) {
	if (existsSync(schemaPath)) {
		try {
			const schemaSql = readFileSync(schemaPath, 'utf-8');
			sqlite.exec(schemaSql);
			console.log(`Database schema initialized from ${schemaPath}`);
			break;
		} catch (err) {
			console.error(`Failed to initialize schema from ${schemaPath}:`, err);
		}
	}
}

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
