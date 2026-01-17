import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryOne, queryAll, execute, transaction } from '$lib/server/db/client';
import { createBookingSchema, getBookingsQuerySchema } from '$lib/schemas/booking';
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
import type { EventRow, CalendarRow } from '$lib/types/calendar';
import { rowToEvent } from '$lib/types/calendar';
import { validateBookingSlot } from '$lib/server/services/availability';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/bookings - List bookings
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const params = {
		templateId: event.url.searchParams.get('templateId') || undefined,
		status: event.url.searchParams.get('status') || undefined,
		start: event.url.searchParams.get('start') || undefined,
		end: event.url.searchParams.get('end') || undefined
	};

	const parsed = getBookingsQuerySchema.safeParse(params);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	let query = `
    SELECT b.* FROM bookings b
    INNER JOIN availability_templates t ON b.template_id = t.id
    WHERE t.user_id = ?
  `;
	const queryParams: unknown[] = [user.id];

	if (parsed.data.templateId) {
		query += ' AND b.template_id = ?';
		queryParams.push(parsed.data.templateId);
	}

	if (parsed.data.status) {
		query += ' AND b.status = ?';
		queryParams.push(parsed.data.status);
	}

	if (parsed.data.start) {
		query += ' AND b.start_time >= ?';
		queryParams.push(parsed.data.start.toISOString());
	}

	if (parsed.data.end) {
		query += ' AND b.end_time <= ?';
		queryParams.push(parsed.data.end.toISOString());
	}

	query += ' ORDER BY b.start_time';

	const rows = queryAll<BookingRow>(query, queryParams);

	return json({
		bookings: rows.map((r) => {
			const booking = rowToBooking(r);
			return {
				...booking,
				startTime: booking.startTime.toISOString(),
				endTime: booking.endTime.toISOString(),
				createdAt: booking.createdAt.toISOString()
			};
		})
	});
};

// POST /api/bookings - Create a booking
export const POST: RequestHandler = async (event) => {
	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createBookingSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { templateId, bookerName, bookerEmail, bookerPhone, bookerNotes, startTime, endTime } =
		parsed.data;

	// Get template
	const templateRow = queryOne<AvailabilityTemplateRow>(
		'SELECT * FROM availability_templates WHERE id = ? AND is_active = 1',
		[templateId]
	);

	if (!templateRow) {
		return errors.notFound('Template', event.locals.requestId);
	}

	const template = rowToAvailabilityTemplate(templateRow);

	// Get windows and overrides
	const windowRows = queryAll<AvailabilityWindowRow>(
		'SELECT * FROM availability_windows WHERE template_id = ?',
		[templateId]
	);
	const windows = windowRows.map(rowToAvailabilityWindow);

	const overrideRows = queryAll<AvailabilityOverrideRow>(
		'SELECT * FROM availability_overrides WHERE template_id = ?',
		[templateId]
	);
	const overrides = overrideRows.map(rowToAvailabilityOverride);

	// Get existing bookings
	const bookingRows = queryAll<BookingRow>(
		`SELECT * FROM bookings WHERE template_id = ? AND status != 'cancelled'`,
		[templateId]
	);
	const existingBookings = bookingRows.map(rowToBooking);

	// Get blocked times
	const eventRows = queryAll<EventRow>(
		`SELECT e.* FROM events e
     INNER JOIN calendars c ON e.calendar_id = c.id
     WHERE c.user_id = ? AND e.status != 'cancelled'`,
		[template.userId]
	);
	const blockedTimes = eventRows.map(rowToEvent);

	// Validate the slot
	const validation = validateBookingSlot(
		{ template, windows, overrides, existingBookings, blockedTimes },
		startTime,
		endTime
	);

	if (!validation.valid) {
		return errors.badRequest(validation.reason || 'Invalid slot', event.locals.requestId);
	}

	// Create booking and event in transaction
	return transaction(() => {
		const bookingId = generateId();
		const confirmationToken = generateId();

		// Get host's default calendar
		const defaultCalendar = queryOne<CalendarRow>(
			'SELECT * FROM calendars WHERE user_id = ? AND is_default = 1',
			[template.userId]
		);

		let eventId: string | null = null;

		if (defaultCalendar) {
			// Create event on host's calendar
			eventId = generateId();
			execute(
				`INSERT INTO events (id, calendar_id, title, description, start_time, end_time, is_all_day, timezone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					eventId,
					defaultCalendar.id,
					`Booking: ${bookerName}`,
					`Booked by: ${bookerName}\nEmail: ${bookerEmail}${bookerPhone ? '\nPhone: ' + bookerPhone : ''}${bookerNotes ? '\n\nNotes: ' + bookerNotes : ''}`,
					startTime.toISOString(),
					endTime.toISOString(),
					0,
					template.timezone,
					'confirmed'
				]
			);
		}

		// Create booking
		execute(
			`INSERT INTO bookings (id, template_id, event_id, booker_name, booker_email, booker_phone, booker_notes, start_time, end_time, status, confirmation_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				bookingId,
				templateId,
				eventId,
				bookerName,
				bookerEmail,
				bookerPhone,
				bookerNotes,
				startTime.toISOString(),
				endTime.toISOString(),
				'confirmed',
				confirmationToken
			]
		);

		const row = queryOne<BookingRow>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
		const booking = rowToBooking(row!);

		return json(
			{
				booking: {
					...booking,
					startTime: booking.startTime.toISOString(),
					endTime: booking.endTime.toISOString(),
					createdAt: booking.createdAt.toISOString()
				}
			},
			{ status: 201 }
		);
	});
};
