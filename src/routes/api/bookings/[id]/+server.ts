import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, execute } from '$lib/server/db/client';
import { updateBookingSchema } from '$lib/schemas/booking';
import type { BookingRow } from '$lib/types/booking';
import { rowToBooking } from '$lib/types/booking';
import { requireAuth } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/bookings/[id] - Get a single booking
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const row = queryOne<BookingRow & { user_id: string }>(
		`SELECT b.*, t.user_id FROM bookings b
     INNER JOIN availability_templates t ON b.template_id = t.id
     WHERE b.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	const booking = rowToBooking(row);

	return json({
		booking: {
			...booking,
			startTime: booking.startTime.toISOString(),
			endTime: booking.endTime.toISOString(),
			createdAt: booking.createdAt.toISOString()
		}
	});
};

// PATCH /api/bookings/[id] - Update a booking (mainly status)
export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const row = queryOne<BookingRow & { user_id: string }>(
		`SELECT b.*, t.user_id FROM bookings b
     INNER JOIN availability_templates t ON b.template_id = t.id
     WHERE b.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateBookingSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { status } = parsed.data;

	if (status) {
		execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);

		// If cancelled, also cancel the associated event
		if (status === 'cancelled' && row.event_id) {
			execute("UPDATE events SET status = 'cancelled' WHERE id = ?", [row.event_id]);
		}
	}

	const updatedRow = queryOne<BookingRow>('SELECT * FROM bookings WHERE id = ?', [id]);
	const booking = rowToBooking(updatedRow!);

	return json({
		booking: {
			...booking,
			startTime: booking.startTime.toISOString(),
			endTime: booking.endTime.toISOString(),
			createdAt: booking.createdAt.toISOString()
		}
	});
};

// DELETE /api/bookings/[id] - Cancel a booking
export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = event.params;

	const row = queryOne<BookingRow & { user_id: string }>(
		`SELECT b.*, t.user_id FROM bookings b
     INNER JOIN availability_templates t ON b.template_id = t.id
     WHERE b.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	// Set status to cancelled instead of deleting
	execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

	// Also cancel the associated event
	if (row.event_id) {
		execute("UPDATE events SET status = 'cancelled' WHERE id = ?", [row.event_id]);
	}

	return json({ success: true });
};
