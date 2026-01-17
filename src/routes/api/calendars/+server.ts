import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCalendarSchema } from '$lib/schemas/calendar';
import { calendarRepository } from '$lib/server/repositories';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/calendars - List all calendars
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	let calendars = calendarRepository.findByUserId(user.id);

	// If no calendars exist, create a default one
	if (calendars.length === 0) {
		calendarRepository.create({
			userId: user.id,
			name: 'My Calendar',
			color: '#3b82f6',
			isDefault: true,
			isVisible: true,
			sortOrder: 0
		});
		calendars = calendarRepository.findByUserId(user.id);
	}

	return json({ calendars });
};

// POST /api/calendars - Create a new calendar
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createCalendarSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { name, color, isDefault } = parsed.data;

	// If this is set as default, unset other defaults
	if (isDefault) {
		calendarRepository.unsetDefaultForUser(user.id);
	}

	// Get the next sort order
	const existingCalendars = calendarRepository.findByUserId(user.id);
	const maxSortOrder = Math.max(-1, ...existingCalendars.map((c) => c.sortOrder ?? 0));

	const calendar = calendarRepository.create({
		userId: user.id,
		name,
		color,
		isDefault: isDefault ?? false,
		isVisible: true,
		sortOrder: maxSortOrder + 1
	});

	return json({ calendar }, { status: 201 });
};
