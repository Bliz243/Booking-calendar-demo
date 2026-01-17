import { defineConfig } from 'drizzle-kit';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/calendar.db';

// Ensure database directory exists
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/drizzle/schema/index.ts',
	out: './drizzle',
	dbCredentials: {
		url: dbPath
	}
});
