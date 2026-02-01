import type Database from 'better-sqlite3';
import { sqlite, closeDb as closeDrizzleDb } from './drizzle';

// Re-use the sqlite connection from drizzle (schema already initialized there)
export function getDb(): Database.Database {
	return sqlite;
}

export function closeDb(): void {
	closeDrizzleDb();
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
