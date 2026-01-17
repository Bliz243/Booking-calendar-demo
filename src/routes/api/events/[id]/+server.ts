import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateEventSchema, recurringUpdateModeSchema } from '$lib/schemas/calendar';
import { calendarRepository, eventRepository } from '$lib/server/repositories';
import { computeRecurrenceBounds } from '$lib/server/services/recurrence';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';
import { generateId } from '$lib/server/db/drizzle';
import { bookingRepository } from '$lib/server/domains/booking';

// GET /api/events/[id] - Get a single event
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const row = eventRepository.findById(id);

	if (!row) {
		return errors.notFound('Event', event.locals.requestId);
	}

	// Verify access via calendar ownership
	const calendar = calendarRepository.findByIdAndUserId(row.calendarId, user.id);

	if (!calendar) {
		return errors.notFound('Event', event.locals.requestId);
	}

	return json({
		event: {
			id: row.id,
			calendarId: row.calendarId,
			title: row.title,
			description: row.description,
			location: row.location,
			startTime: row.startTime,
			endTime: row.endTime,
			isAllDay: row.isAllDay,
			timezone: row.timezone,
			rrule: row.rrule,
			recurrenceStart: row.recurrenceStart,
			recurrenceEnd: row.recurrenceEnd,
			status: row.status
		}
	});
};

// PATCH /api/events/[id] - Update an event
export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const modeParam = event.url.searchParams.get('mode') || 'all';
	const modeResult = recurringUpdateModeSchema.safeParse(modeParam);

	if (!modeResult.success) {
		return errors.badRequest('Invalid mode parameter', event.locals.requestId);
	}

	const mode = modeResult.data;

	const row = eventRepository.findById(id);

	if (!row) {
		return errors.notFound('Event', event.locals.requestId);
	}

	// Verify access (allow system calendars for staff/admin)
	const calendar = calendarRepository.findByIdAndUserId(row.calendarId, user.id);
	const systemCalendar = calendarRepository.findById(row.calendarId);

	if (!calendar && (!systemCalendar || !systemCalendar.isSystem)) {
		return errors.notFound('Event', event.locals.requestId);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateEventSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const updates = parsed.data;

	// If this event is linked to a booking and times are being changed,
	// sync the booking times. Simple and fast - no complex validation.
	if (updates.startTime !== undefined || updates.endTime !== undefined) {
		const linkedBooking = bookingRepository.findByEventId(id);

		if (linkedBooking) {
			const newStart = updates.startTime || new Date(row.startTime);
			const newEnd = updates.endTime || new Date(row.endTime);
			bookingRepository.updateTimes(linkedBooking.id, newStart, newEnd);
		}
	}

	// Handle recurring event modifications
	if (row.rrule && mode !== 'all') {
		const originalStart = event.url.searchParams.get('originalStart');

		if (!originalStart) {
			return errors.badRequest(
				'originalStart parameter required for single/future instance updates',
				event.locals.requestId
			);
		}

		if (mode === 'this') {
			// Create an exception for this single instance
			const exception = eventRepository.upsertException({
				eventId: id,
				originalStart,
				exceptionType: 'modified',
				title: updates.title || null,
				startTime: updates.startTime?.toISOString() || null,
				endTime: updates.endTime?.toISOString() || null
			});

			return json({
				event: {
					id: row.id,
					calendarId: row.calendarId,
					title: row.title,
					description: row.description,
					location: row.location,
					startTime: row.startTime,
					endTime: row.endTime,
					isAllDay: row.isAllDay,
					timezone: row.timezone,
					rrule: row.rrule,
					recurrenceStart: row.recurrenceStart,
					recurrenceEnd: row.recurrenceEnd,
					status: row.status
				},
				exception: {
					id: exception.id,
					eventId: id,
					originalStart,
					type: 'modified',
					title: updates.title,
					startTime: updates.startTime?.toISOString(),
					endTime: updates.endTime?.toISOString()
				}
			});
		}

		if (mode === 'future') {
			// Split the series
			const originalDate = new Date(originalStart);
			const newRecurrenceEnd = new Date(originalDate.getTime() - 1);

			eventRepository.update(id, { recurrenceEnd: newRecurrenceEnd.toISOString() });

			const existingStartTime = new Date(row.startTime);
			const existingEndTime = new Date(row.endTime);
			const newStartTime = updates.startTime || originalDate;
			const newEndTime =
				updates.endTime ||
				new Date(
					newStartTime.getTime() + (existingEndTime.getTime() - existingStartTime.getTime())
				);

			const newRRule = updates.rrule !== undefined ? updates.rrule : row.rrule;
			let newRecStart: string | null = null;
			let newRecEnd: string | null = null;

			if (newRRule) {
				const bounds = computeRecurrenceBounds(newRRule, newStartTime);
				newRecStart = bounds.start.toISOString();
				newRecEnd = bounds.end?.toISOString() || null;
			}

			const newEvent = eventRepository.create({
				calendarId: row.calendarId,
				title: updates.title ?? row.title,
				description: updates.description !== undefined ? updates.description : row.description,
				location: updates.location !== undefined ? updates.location : row.location,
				startTime: newStartTime.toISOString(),
				endTime: newEndTime.toISOString(),
				isAllDay: updates.isAllDay !== undefined ? updates.isAllDay : row.isAllDay,
				timezone: updates.timezone ?? row.timezone,
				rrule: newRRule,
				recurrenceStart: newRecStart,
				recurrenceEnd: newRecEnd,
				status: (updates.status ?? row.status) as 'confirmed' | 'tentative' | 'cancelled'
			});

			return json({
				event: {
					id: newEvent.id,
					calendarId: newEvent.calendarId,
					title: newEvent.title,
					description: newEvent.description,
					location: newEvent.location,
					startTime: newEvent.startTime,
					endTime: newEvent.endTime,
					isAllDay: newEvent.isAllDay,
					timezone: newEvent.timezone,
					rrule: newEvent.rrule,
					recurrenceStart: newEvent.recurrenceStart,
					recurrenceEnd: newEvent.recurrenceEnd,
					status: newEvent.status
				},
				splitFrom: id
			});
		}
	}

	// Update all instances (or single non-recurring event)
	const updateData: Parameters<typeof eventRepository.update>[1] = {};

	if (updates.title !== undefined) updateData.title = updates.title;
	if (updates.description !== undefined) updateData.description = updates.description;
	if (updates.location !== undefined) updateData.location = updates.location;
	if (updates.startTime !== undefined) updateData.startTime = updates.startTime.toISOString();
	if (updates.endTime !== undefined) updateData.endTime = updates.endTime.toISOString();
	if (updates.isAllDay !== undefined) updateData.isAllDay = updates.isAllDay;
	if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
	if (updates.status !== undefined)
		updateData.status = updates.status as 'confirmed' | 'tentative' | 'cancelled';

	if (updates.rrule !== undefined) {
		updateData.rrule = updates.rrule;

		if (updates.rrule) {
			const startTime = updates.startTime || new Date(row.startTime);
			const bounds = computeRecurrenceBounds(updates.rrule, startTime);
			updateData.recurrenceStart = bounds.start.toISOString();
			updateData.recurrenceEnd = bounds.end?.toISOString() || null;
		} else {
			updateData.recurrenceStart = null;
			updateData.recurrenceEnd = null;
		}
	}

	const updatedEvent = eventRepository.update(id, updateData);

	return json({
		event: {
			id: updatedEvent!.id,
			calendarId: updatedEvent!.calendarId,
			title: updatedEvent!.title,
			description: updatedEvent!.description,
			location: updatedEvent!.location,
			startTime: updatedEvent!.startTime,
			endTime: updatedEvent!.endTime,
			isAllDay: updatedEvent!.isAllDay,
			timezone: updatedEvent!.timezone,
			rrule: updatedEvent!.rrule,
			recurrenceStart: updatedEvent!.recurrenceStart,
			recurrenceEnd: updatedEvent!.recurrenceEnd,
			status: updatedEvent!.status
		}
	});
};

// DELETE /api/events/[id] - Delete an event
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const modeParam = event.url.searchParams.get('mode') || 'all';
	const modeResult = recurringUpdateModeSchema.safeParse(modeParam);

	if (!modeResult.success) {
		return errors.badRequest('Invalid mode parameter', event.locals.requestId);
	}

	const mode = modeResult.data;

	const row = eventRepository.findById(id);

	if (!row) {
		return errors.notFound('Event', event.locals.requestId);
	}

	// Verify access
	const calendar = calendarRepository.findByIdAndUserId(row.calendarId, user.id);

	if (!calendar) {
		return errors.notFound('Event', event.locals.requestId);
	}

	// Handle recurring event deletions
	if (row.rrule && mode !== 'all') {
		const originalStart = event.url.searchParams.get('originalStart');

		if (!originalStart) {
			return errors.badRequest(
				'originalStart parameter required for single/future instance deletes',
				event.locals.requestId
			);
		}

		if (mode === 'this') {
			eventRepository.upsertException({
				eventId: id,
				originalStart,
				exceptionType: 'deleted'
			});

			return json({ success: true, deletedInstance: originalStart });
		}

		if (mode === 'future') {
			const originalDate = new Date(originalStart);
			const newRecurrenceEnd = new Date(originalDate.getTime() - 1);

			eventRepository.update(id, { recurrenceEnd: newRecurrenceEnd.toISOString() });

			return json({ success: true, seriesEndedAt: newRecurrenceEnd.toISOString() });
		}
	}

	// Delete all instances
	eventRepository.delete(id);

	return json({ success: true });
};
