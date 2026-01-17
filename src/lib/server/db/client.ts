import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../../../data/calendar.db');

// Ensure database directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database | null = null;

function initializeSchema(): void {
	if (!db) return;
	const schemaPath = join(__dirname, 'schema.sql');
	const schema = readFileSync(schemaPath, 'utf-8');
	db.exec(schema);
}

export function getDb(): Database.Database {
	if (!db) {
		db = new Database(DB_PATH);
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
		initializeSchema();
	}
	return db;
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}

export function generateId(): string {
	return crypto.randomUUID();
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
	return getDb()
		.prepare(sql)
		.get(...params) as T | undefined;
}

export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
	return getDb()
		.prepare(sql)
		.all(...params) as T[];
}

export function execute(sql: string, params: unknown[] = []): Database.RunResult {
	return getDb()
		.prepare(sql)
		.run(...params);
}

export function transaction<T>(fn: () => T): T {
	return getDb().transaction(fn)();
}
