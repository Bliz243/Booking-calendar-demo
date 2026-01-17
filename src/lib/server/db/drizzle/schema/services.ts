import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const services = sqliteTable('services', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	color: text('color').default('#3b82f6'),
	priceCents: integer('price_cents'),

	// Duration
	durationMinutes: integer('duration_minutes').notNull(),
	minDurationMinutes: integer('min_duration_minutes'),
	maxDurationMinutes: integer('max_duration_minutes'),

	// Time constraints
	operatingDays: text('operating_days').notNull().default('1,2,3,4,5'),
	operatingStartTime: text('operating_start_time').notNull().default('09:00'),
	operatingEndTime: text('operating_end_time').notNull().default('17:00'),
	minNoticeHours: integer('min_notice_hours').default(24),
	maxAdvanceDays: integer('max_advance_days').default(30),

	// Booking rules
	bufferMinutes: integer('buffer_minutes').default(0),
	maxConcurrentPerCustomer: integer('max_concurrent_per_customer').default(0),
	cancellationHours: integer('cancellation_hours').default(4),
	requiresApproval: integer('requires_approval', { mode: 'boolean' }).default(false),
	capacity: integer('capacity').default(1),

	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	sortOrder: integer('sort_order').default(0),
	createdAt: text('created_at').default('CURRENT_TIMESTAMP')
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
