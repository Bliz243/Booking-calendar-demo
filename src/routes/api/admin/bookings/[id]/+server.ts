import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateServiceBookingSchema } from '$lib/schemas/service';
import {
	getServiceBookingById,
	cancelBooking,
	updateBookingStatus
} from '$lib/server/services/booking-service';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/bookings/[id] - Get booking details
export const GET: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const booking = getServiceBookingById(id);

	if (!booking) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	return json({ booking });
};

// PATCH /api/admin/bookings/[id] - Update a booking
export const PATCH: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateServiceBookingSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const booking = getServiceBookingById(id);

	if (!booking) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	// Handle status updates
	if (parsed.data.status) {
		if (parsed.data.status === 'cancelled') {
			const result = cancelBooking(id, undefined, {
				isStaff: true,
				staffId: user.id
			});

			if (!result.success) {
				return errors.badRequest(
					result.error || 'Failed to cancel booking',
					event.locals.requestId
				);
			}
		} else if (parsed.data.status === 'completed' || parsed.data.status === 'no_show') {
			const result = updateBookingStatus(id, parsed.data.status);

			if (!result.success) {
				return errors.badRequest(result.error || 'Failed to update status', event.locals.requestId);
			}
		}
	}

	// Note: Customer info updates would go here if needed

	const updatedBooking = getServiceBookingById(id);
	return json({ booking: updatedBooking });
};

// DELETE /api/admin/bookings/[id] - Cancel a booking
export const DELETE: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	let reason: string | undefined;

	try {
		const body = await event.request.json();
		reason = body.reason;
	} catch {
		// No body provided
	}

	const result = cancelBooking(id, reason, {
		isStaff: true,
		staffId: user.id
	});

	if (!result.success) {
		return errors.badRequest(result.error || 'Failed to cancel booking', event.locals.requestId);
	}

	return json({ booking: result.booking });
};
