import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEventSchema, getEventsQuerySchema } from '$lib/schemas/calendar';
import { calendarRepository, eventRepository } from '$lib/server/repositories';
import { bookingRepository } from '$lib/server/domains/booking';
import { expandRecurringEvents, computeRecurrenceBounds } from '$lib/server/services/recurrence';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// Helper to convert Drizzle event to the format expected by the frontend
function formatEvent(event: ReturnType<typeof eventRepository.findById>) {
	if (!event) return null;
	return {
		id: event.id,
		calendarId: event.calendarId,
		title: event.title,
		description: event.description,
		location: event.location,
		startTime: event.startTime,
		endTime: event.endTime,
		isAllDay: event.isAllDay,
		timezone: event.timezone,
		rrule: event.rrule,
		recurrenceStart: event.recurrenceStart,
		recurrenceEnd: event.recurrenceEnd,
		status: event.status
	};
}

// GET /api/events - Get events in a date range
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const params = {
		start: event.url.searchParams.get('start'),
		end: event.url.searchParams.get('end'),
		calendarIds: event.url.searchParams.get('calendarIds')
	};

	const parsed = getEventsQuerySchema.safeParse(params);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	const { start, end, calendarIds } = parsed.data;

	// Get user's calendars
	let calendars;
	if (calendarIds && calendarIds.length > 0) {
		calendars = calendarRepository.findByIdsAndUserId(calendarIds, user.id);
	} else {
		calendars = calendarRepository.findByUserId(user.id);
	}

	const calendarMap = new Map(
		calendars.map((c) => [
			c.id,
			{
				id: c.id,
				userId: c.userId,
				name: c.name,
				color: c.color ?? '#3b82f6',
				isDefault: c.isDefault ?? false,
				isVisible: c.isVisible ?? true,
				sortOrder: c.sortOrder ?? 0,
				isSystem: c.isSystem ?? false
			}
		])
	);
	const calendarIdList = Array.from(calendarMap.keys());

	if (calendarIdList.length === 0) {
		return json({ events: [], instances: [] });
	}

	// Get events in range
	const eventRows = eventRepository.findInRange(calendarIdList, start, end);

	// Get booking info for events (for client-side conflict detection)
	const eventIds = eventRows.map((e) => e.id);
	const bookingInfoMap = bookingRepository.findBookingInfoByEventIds(eventIds);

	// Convert to the format expected by recurrence service (including booking info)
	const events = eventRows.map((e) => {
		const bookingInfo = bookingInfoMap.get(e.id);
		return {
			id: e.id,
			calendarId: e.calendarId,
			title: e.title,
			description: e.description,
			location: e.location,
			startTime: new Date(e.startTime),
			endTime: new Date(e.endTime),
			isAllDay: e.isAllDay ?? false,
			timezone: e.timezone ?? 'UTC',
			rrule: e.rrule,
			recurrenceStart: e.recurrenceStart ? new Date(e.recurrenceStart) : null,
			recurrenceEnd: e.recurrenceEnd ? new Date(e.recurrenceEnd) : null,
			status: (e.status ?? 'confirmed') as 'confirmed' | 'tentative' | 'cancelled',
			bookingId: bookingInfo?.bookingId ?? null,
			assignedResourceIds: bookingInfo?.resourceIds ?? []
		};
	});

	// Get exceptions for recurring events
	const recurringEventIds = events.filter((e) => e.rrule).map((e) => e.id);
	const exceptionsMap = new Map<string, import('$lib/types/calendar').EventException[]>();

	if (recurringEventIds.length > 0) {
		const exceptionRows = eventRepository.findExceptionsByEventIds(recurringEventIds);

		for (const row of exceptionRows) {
			const exception: import('$lib/types/calendar').EventException = {
				id: row.id,
				eventId: row.eventId,
				originalStart: new Date(row.originalStart),
				exceptionType: row.exceptionType as 'modified' | 'deleted',
				title: row.title ?? null,
				startTime: row.startTime ? new Date(row.startTime) : null,
				endTime: row.endTime ? new Date(row.endTime) : null
			};
			if (!exceptionsMap.has(row.eventId)) {
				exceptionsMap.set(row.eventId, []);
			}
			exceptionsMap.get(row.eventId)!.push(exception);
		}
	}

	// Expand recurring events
	const instances = expandRecurringEvents(events, calendarMap, start, end, exceptionsMap);

	return json({
		events: events.map((e) => ({
			...e,
			startTime: e.startTime.toISOString(),
			endTime: e.endTime.toISOString(),
			recurrenceStart: e.recurrenceStart?.toISOString(),
			recurrenceEnd: e.recurrenceEnd?.toISOString()
		})),
		instances: instances.map((i) => ({
			...i,
			startTime: i.startTime.toISOString(),
			endTime: i.endTime.toISOString(),
			originalStart: i.originalStart?.toISOString()
		}))
	});
};

// POST /api/events - Create a new event
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createEventSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const {
		calendarId,
		title,
		description,
		location,
		startTime,
		endTime,
		isAllDay,
		timezone,
		rrule
	} = parsed.data;

	// Verify calendar exists and belongs to user
	const calendar = calendarRepository.findByIdAndUserId(calendarId, user.id);

	if (!calendar) {
		return errors.notFound('Calendar', event.locals.requestId);
	}

	// Compute recurrence bounds if recurring
	let recurrenceStart: string | null = null;
	let recurrenceEnd: string | null = null;

	if (rrule) {
		const bounds = computeRecurrenceBounds(rrule, startTime);
		recurrenceStart = bounds.start.toISOString();
		recurrenceEnd = bounds.end?.toISOString() || null;
	}

	const createdEvent = eventRepository.create({
		calendarId,
		title,
		description: description || null,
		location: location || null,
		startTime: startTime.toISOString(),
		endTime: endTime.toISOString(),
		isAllDay: isAllDay ?? false,
		timezone,
		rrule: rrule || null,
		recurrenceStart,
		recurrenceEnd,
		status: 'confirmed'
	});

	return json(
		{
			event: {
				...createdEvent,
				startTime: createdEvent.startTime,
				endTime: createdEvent.endTime,
				recurrenceStart: createdEvent.recurrenceStart,
				recurrenceEnd: createdEvent.recurrenceEnd
			}
		},
		{ status: 201 }
	);
};
