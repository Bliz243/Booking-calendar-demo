import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { beforeEach, afterAll, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory database for testing
let testDb: Database.Database | null = null;

export function getTestDb(): Database.Database {
	if (!testDb) {
		testDb = new Database(':memory:');
		testDb.pragma('foreign_keys = ON');
		initializeTestSchema();
	}
	return testDb;
}

function initializeTestSchema(): void {
	if (!testDb) return;

	const schemaPath = join(__dirname, '../lib/server/db/schema.sql');
	const schema = readFileSync(schemaPath, 'utf-8');
	testDb.exec(schema);
}

// Tables to clear between tests (in order respecting foreign keys)
const TABLES_TO_CLEAR = [
	'booking_resource_assignments',
	'service_bookings',
	'service_resource_requirements',
	'resource_qualifications',
	'event_resources',
	'resource_availability',
	'event_exceptions',
	'availability_overrides',
	'availability_windows',
	'bookings',
	'events',
	'resources',
	'qualifications',
	'resource_types',
	'availability_templates',
	'services',
	'calendars',
	'verification',
	'account',
	'session',
	'users'
];

export function clearTestDatabase(): void {
	const db = getTestDb();

	// Disable foreign keys temporarily to allow truncation
	db.pragma('foreign_keys = OFF');

	for (const table of TABLES_TO_CLEAR) {
		try {
			db.exec(`DELETE FROM ${table}`);
		} catch {
			// Table might not exist yet (e.g., auth tables)
		}
	}

	db.pragma('foreign_keys = ON');
}

export function closeTestDatabase(): void {
	if (testDb) {
		testDb.close();
		testDb = null;
	}
}

// Mock the database client module to use test database
vi.mock('$lib/server/db/client', () => {
	return {
		getDb: () => getTestDb(),
		closeDb: () => closeTestDatabase(),
		generateId: () => crypto.randomUUID(),
		queryOne: <T>(sql: string, params: unknown[] = []): T | undefined => {
			return getTestDb()
				.prepare(sql)
				.get(...params) as T | undefined;
		},
		queryAll: <T>(sql: string, params: unknown[] = []): T[] => {
			return getTestDb()
				.prepare(sql)
				.all(...params) as T[];
		},
		execute: (sql: string, params: unknown[] = []) => {
			return getTestDb()
				.prepare(sql)
				.run(...params);
		},
		transaction: <T>(fn: () => T): T => {
			return getTestDb().transaction(fn)();
		}
	};
});

// Clear database before each test
beforeEach(() => {
	clearTestDatabase();
});

// Close database after all tests
afterAll(() => {
	closeTestDatabase();
});
