import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rejectBooking, getServiceBookingById } from '$lib/server/services/booking-service';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// POST /api/admin/bookings/[id]/reject - Reject a pending booking
export const POST: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	let reason: string | undefined;

	try {
		const body = await event.request.json();
		reason = body.reason;
	} catch {
		// No body provided
	}

	const booking = getServiceBookingById(id);

	if (!booking) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	const result = rejectBooking(id, user.id, reason);

	if (!result.success) {
		return errors.badRequest(result.error || 'Failed to reject booking', event.locals.requestId);
	}

	// Fetch the full booking with details
	const updatedBooking = getServiceBookingById(id);

	return json({ booking: updatedBooking });
};
