import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const calendars = sqliteTable('calendars', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(), // 'system' for system calendars
	name: text('name').notNull(),
	color: text('color').default('#3b82f6'),
	isDefault: integer('is_default', { mode: 'boolean' }).default(false),
	isVisible: integer('is_visible', { mode: 'boolean' }).default(true),
	sortOrder: integer('sort_order').default(0),
	isSystem: integer('is_system', { mode: 'boolean' }).default(false) // System calendars visible to all staff/admin
});

export type Calendar = typeof calendars.$inferSelect;
export type NewCalendar = typeof calendars.$inferInsert;
