import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, queryAll } from '$lib/server/db/client';
import { getAvailabilityQuerySchema } from '$lib/schemas/booking';
import type {
	AvailabilityTemplateRow,
	AvailabilityWindowRow,
	AvailabilityOverrideRow,
	BookingRow
} from '$lib/types/booking';
import {
	rowToAvailabilityTemplate,
	rowToAvailabilityWindow,
	rowToAvailabilityOverride,
	rowToBooking
} from '$lib/types/booking';
import type { EventRow } from '$lib/types/calendar';
import { rowToEvent } from '$lib/types/calendar';
import { calculateAvailableSlots } from '$lib/server/services/availability';

// GET /api/availability - Get available slots for a template
export const GET: RequestHandler = async ({ url }) => {
	const params = {
		templateId: url.searchParams.get('templateId'),
		start: url.searchParams.get('start'),
		end: url.searchParams.get('end')
	};

	const parsed = getAvailabilityQuerySchema.safeParse(params);

	if (!parsed.success) {
		return json({ error: 'Invalid query params', details: parsed.error.issues }, { status: 400 });
	}

	const { templateId, start, end } = parsed.data;

	// Get template
	const templateRow = queryOne<AvailabilityTemplateRow>(
		'SELECT * FROM availability_templates WHERE id = ? AND is_active = 1',
		[templateId]
	);

	if (!templateRow) {
		return json({ error: 'Template not found or inactive' }, { status: 404 });
	}

	const template = rowToAvailabilityTemplate(templateRow);

	// Get windows
	const windowRows = queryAll<AvailabilityWindowRow>(
		'SELECT * FROM availability_windows WHERE template_id = ?',
		[templateId]
	);
	const windows = windowRows.map(rowToAvailabilityWindow);

	// Get overrides for the date range
	const overrideRows = queryAll<AvailabilityOverrideRow>(
		'SELECT * FROM availability_overrides WHERE template_id = ? AND date >= ? AND date <= ?',
		[templateId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
	);
	const overrides = overrideRows.map(rowToAvailabilityOverride);

	// Get existing bookings in range
	const bookingRows = queryAll<BookingRow>(
		`SELECT * FROM bookings
     WHERE template_id = ?
       AND status != 'cancelled'
       AND start_time <= ?
       AND end_time >= ?`,
		[templateId, end.toISOString(), start.toISOString()]
	);
	const existingBookings = bookingRows.map(rowToBooking);

	// Get blocked times from host's calendar
	const eventRows = queryAll<EventRow>(
		`SELECT e.* FROM events e
     INNER JOIN calendars c ON e.calendar_id = c.id
     WHERE c.user_id = ?
       AND e.status != 'cancelled'
       AND e.start_time <= ?
       AND e.end_time >= ?`,
		[template.userId, end.toISOString(), start.toISOString()]
	);
	const blockedTimes = eventRows.map(rowToEvent);

	// Calculate available slots
	const slots = calculateAvailableSlots(
		{ template, windows, overrides, existingBookings, blockedTimes },
		start,
		end
	);

	return json({
		template: {
			id: template.id,
			name: template.name,
			timezone: template.timezone,
			slotDuration: template.slotDuration
		},
		slots: slots.map((s) => ({
			startTime: s.startTime.toISOString(),
			endTime: s.endTime.toISOString(),
			available: s.available
		}))
	});
};
