import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { calendars } from './calendars';

export const events = sqliteTable('events', {
	id: text('id').primaryKey(),
	calendarId: text('calendar_id')
		.notNull()
		.references(() => calendars.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	location: text('location'),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
	isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false),
	timezone: text('timezone').default('UTC'),
	rrule: text('rrule'),
	recurrenceStart: text('recurrence_start'),
	recurrenceEnd: text('recurrence_end'),
	status: text('status', { enum: ['confirmed', 'tentative', 'cancelled'] }).default('confirmed')
});

export const eventExceptions = sqliteTable(
	'event_exceptions',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		originalStart: text('original_start').notNull(),
		exceptionType: text('exception_type', { enum: ['modified', 'deleted'] }).notNull(),
		title: text('title'),
		startTime: text('start_time'),
		endTime: text('end_time')
	},
	(table) => [unique().on(table.eventId, table.originalStart)]
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventException = typeof eventExceptions.$inferSelect;
export type NewEventException = typeof eventExceptions.$inferInsert;
