import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateCalendarSchema } from '$lib/schemas/calendar';
import { calendarRepository } from '$lib/server/repositories';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/calendars/[id] - Get a single calendar
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const calendar = calendarRepository.findByIdAndUserId(id, user.id);

	if (!calendar) {
		return errors.notFound('Calendar', event.locals.requestId);
	}

	return json({ calendar });
};

// PATCH /api/calendars/[id] - Update a calendar
export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const existing = calendarRepository.findByIdAndUserId(id, user.id);

	if (!existing) {
		return errors.notFound('Calendar', event.locals.requestId);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateCalendarSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const updates = parsed.data;

	// If setting as default, unset other defaults first
	if (updates.isDefault) {
		calendarRepository.unsetDefaultForUser(user.id);
	}

	const calendar = calendarRepository.update(id, user.id, updates);

	return json({ calendar });
};

// DELETE /api/calendars/[id] - Delete a calendar
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const existing = calendarRepository.findByIdAndUserId(id, user.id);

	if (!existing) {
		return errors.notFound('Calendar', event.locals.requestId);
	}

	// Prevent deleting the default calendar
	if (existing.isDefault) {
		return errors.badRequest('Cannot delete the default calendar', event.locals.requestId);
	}

	calendarRepository.delete(id, user.id);

	return json({ success: true });
};
