import { eq, and, inArray, or, lte, gte, isNull } from 'drizzle-orm';
import { db, generateId } from '../db/drizzle';
import {
	events,
	eventExceptions,
	type Event,
	type NewEvent,
	type EventException,
	type NewEventException
} from '../db/drizzle/schema/events';

export const eventRepository = {
	/**
	 * Find events in a date range for given calendar IDs
	 */
	findInRange(calendarIds: string[], start: Date, end: Date): Event[] {
		if (calendarIds.length === 0) return [];

		const startIso = start.toISOString();
		const endIso = end.toISOString();

		return db
			.select()
			.from(events)
			.where(
				and(
					inArray(events.calendarId, calendarIds),
					or(
						// Non-recurring events in range
						and(isNull(events.rrule), lte(events.startTime, endIso), gte(events.endTime, startIso)),
						// Recurring events that might have instances in range
						and(
							events.rrule,
							or(isNull(events.recurrenceEnd), gte(events.recurrenceEnd, startIso)),
							lte(events.recurrenceStart, endIso)
						)
					)
				)
			)
			.orderBy(events.startTime)
			.all();
	},

	/**
	 * Find a single event by ID
	 */
	findById(id: string): Event | undefined {
		return db.select().from(events).where(eq(events.id, id)).get();
	},

	/**
	 * Find event exceptions for given event IDs
	 */
	findExceptionsByEventIds(eventIds: string[]): EventException[] {
		if (eventIds.length === 0) return [];
		return db
			.select()
			.from(eventExceptions)
			.where(inArray(eventExceptions.eventId, eventIds))
			.all();
	},

	/**
	 * Create a new event
	 */
	create(data: Omit<NewEvent, 'id'>): Event {
		const id = generateId();
		const event: NewEvent = { id, ...data };
		db.insert(events).values(event).run();
		return db.select().from(events).where(eq(events.id, id)).get()!;
	},

	/**
	 * Update an event
	 */
	update(id: string, data: Partial<Omit<NewEvent, 'id'>>): Event | undefined {
		const existing = this.findById(id);
		if (!existing) return undefined;

		if (Object.keys(data).length > 0) {
			db.update(events).set(data).where(eq(events.id, id)).run();
		}

		return this.findById(id);
	},

	/**
	 * Delete an event
	 */
	delete(id: string): boolean {
		const existing = this.findById(id);
		if (!existing) return false;

		db.delete(events).where(eq(events.id, id)).run();
		return true;
	},

	/**
	 * Create or update an event exception
	 */
	upsertException(data: Omit<NewEventException, 'id'> & { id?: string }): EventException {
		const id = data.id || generateId();

		// Check if exception exists
		const existing = db
			.select()
			.from(eventExceptions)
			.where(
				and(
					eq(eventExceptions.eventId, data.eventId),
					eq(eventExceptions.originalStart, data.originalStart)
				)
			)
			.get();

		if (existing) {
			db.update(eventExceptions)
				.set({
					exceptionType: data.exceptionType,
					title: data.title,
					startTime: data.startTime,
					endTime: data.endTime
				})
				.where(eq(eventExceptions.id, existing.id))
				.run();
			return db.select().from(eventExceptions).where(eq(eventExceptions.id, existing.id)).get()!;
		}

		db.insert(eventExceptions)
			.values({ id, ...data })
			.run();
		return db.select().from(eventExceptions).where(eq(eventExceptions.id, id)).get()!;
	}
};
