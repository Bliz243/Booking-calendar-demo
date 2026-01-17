import { calendarRepository } from '../repositories/calendar.repository';
import { eventRepository } from '../repositories/event.repository';
import { recurrenceService } from './recurrence.service';
import type { Event, NewEvent } from '$lib/server/db/drizzle/schema/events';
import type { Calendar } from '$lib/server/db/drizzle/schema/calendars';

export interface CreateEventInput {
	calendarId: string;
	title: string;
	description?: string;
	location?: string;
	startTime: Date;
	endTime: Date;
	isAllDay?: boolean;
	timezone?: string;
	rrule?: string;
}

export interface UpdateEventInput {
	title?: string;
	description?: string;
	location?: string;
	startTime?: Date;
	endTime?: Date;
	isAllDay?: boolean;
	timezone?: string;
	rrule?: string;
	status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface EventInstance {
	id: string;
	eventId: string;
	calendarId: string;
	title: string;
	description: string | null;
	location: string | null;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	color: string;
	isRecurring: boolean;
	isException: boolean;
	originalStart: Date | null;
	status: string;
}

export type EventResult = { event: Event } | { error: string };
export type EventDeleteResult = { success: true } | { error: string };

export const eventService = {
	/**
	 * Get events in a date range for a user
	 * Expands recurring events into instances
	 */
	getInstancesInRange(
		userId: string,
		start: Date,
		end: Date,
		calendarIds?: string[]
	): EventInstance[] {
		// Get calendars
		const calendars = calendarRepository.findByUserId(userId);
		const calendarMap = new Map(calendars.map((c) => [c.id, c]));

		// Filter to requested calendars if specified
		const targetCalendarIds = calendarIds
			? calendarIds.filter((id) => calendarMap.has(id))
			: calendars.map((c) => c.id);

		if (targetCalendarIds.length === 0) {
			return [];
		}

		// Get events
		const events = eventRepository.findInRange(targetCalendarIds, start, end);

		// Get exceptions for recurring events
		const recurringEventIds = events.filter((e) => e.rrule).map((e) => e.id);
		const exceptions = eventRepository.findExceptionsByEventIds(recurringEventIds);

		// Group exceptions by event ID
		const exceptionsByEventId = new Map<string, typeof exceptions>();
		for (const exception of exceptions) {
			const existing = exceptionsByEventId.get(exception.eventId) || [];
			existing.push(exception);
			exceptionsByEventId.set(exception.eventId, existing);
		}

		// Expand recurring events
		return recurrenceService.expandRecurringEvents(
			events,
			calendarMap,
			start,
			end,
			exceptionsByEventId
		);
	},

	/**
	 * Get a single event by ID
	 */
	getById(id: string): Event | undefined {
		return eventRepository.findById(id);
	},

	/**
	 * Create a new event
	 */
	create(userId: string, input: CreateEventInput): EventResult {
		// Verify calendar belongs to user (or is system calendar)
		const calendar = calendarRepository.findByIdAndUserId(input.calendarId, userId);
		const systemCalendar = calendarRepository.findById(input.calendarId);

		if (!calendar && (!systemCalendar || !systemCalendar.isSystem)) {
			return { error: 'Calendar not found' };
		}

		// Compute recurrence bounds if recurring
		let recurrenceStart: string | null = null;
		let recurrenceEnd: string | null = null;

		if (input.rrule) {
			const bounds = recurrenceService.computeRecurrenceBounds(input.rrule, input.startTime);
			recurrenceStart = bounds.start.toISOString();
			recurrenceEnd = bounds.end?.toISOString() || null;
		}

		const data: Omit<NewEvent, 'id'> = {
			calendarId: input.calendarId,
			title: input.title,
			description: input.description || null,
			location: input.location || null,
			startTime: input.startTime.toISOString(),
			endTime: input.endTime.toISOString(),
			isAllDay: input.isAllDay || false,
			timezone: input.timezone || 'UTC',
			rrule: input.rrule || null,
			recurrenceStart,
			recurrenceEnd,
			status: 'confirmed'
		};

		const event = eventRepository.create(data);
		return { event };
	},

	/**
	 * Update an event
	 */
	update(id: string, input: UpdateEventInput): EventResult {
		const existing = eventRepository.findById(id);
		if (!existing) {
			return { error: 'Event not found' };
		}

		const data: Partial<Omit<NewEvent, 'id'>> = {};

		if (input.title !== undefined) data.title = input.title;
		if (input.description !== undefined) data.description = input.description;
		if (input.location !== undefined) data.location = input.location;
		if (input.startTime !== undefined) data.startTime = input.startTime.toISOString();
		if (input.endTime !== undefined) data.endTime = input.endTime.toISOString();
		if (input.isAllDay !== undefined) data.isAllDay = input.isAllDay;
		if (input.timezone !== undefined) data.timezone = input.timezone;
		if (input.status !== undefined) data.status = input.status;

		// Handle rrule changes
		if (input.rrule !== undefined) {
			data.rrule = input.rrule || null;

			if (input.rrule) {
				const startTime = input.startTime || new Date(existing.startTime);
				const bounds = recurrenceService.computeRecurrenceBounds(input.rrule, startTime);
				data.recurrenceStart = bounds.start.toISOString();
				data.recurrenceEnd = bounds.end?.toISOString() || null;
			} else {
				data.recurrenceStart = null;
				data.recurrenceEnd = null;
			}
		}

		const event = eventRepository.update(id, data);
		if (!event) {
			return { error: 'Failed to update event' };
		}

		return { event };
	},

	/**
	 * Delete an event
	 */
	delete(id: string): EventDeleteResult {
		const existing = eventRepository.findById(id);
		if (!existing) {
			return { error: 'Event not found' };
		}

		// Delete exceptions first
		eventRepository.deleteExceptionsByEventId(id);

		// Delete the event
		eventRepository.delete(id);

		return { success: true };
	},

	/**
	 * Create an event for a booking (used by booking domain via adapter)
	 */
	createForBooking(
		calendarId: string,
		title: string,
		description: string,
		startTime: Date,
		endTime: Date
	): Event {
		const data: Omit<NewEvent, 'id'> = {
			calendarId,
			title,
			description,
			location: null,
			startTime: startTime.toISOString(),
			endTime: endTime.toISOString(),
			isAllDay: false,
			timezone: 'UTC',
			rrule: null,
			recurrenceStart: null,
			recurrenceEnd: null,
			status: 'confirmed'
		};

		return eventRepository.create(data);
	},

	/**
	 * Cancel an event (used by booking domain via adapter)
	 */
	cancel(id: string): boolean {
		const event = eventRepository.update(id, { status: 'cancelled' });
		return !!event;
	}
};
