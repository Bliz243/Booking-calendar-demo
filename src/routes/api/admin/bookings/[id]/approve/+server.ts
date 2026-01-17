import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approveBooking, getServiceBookingById } from '$lib/server/services/booking-service';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// POST /api/admin/bookings/[id]/approve - Approve a pending booking
export const POST: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const booking = getServiceBookingById(id);

	if (!booking) {
		return errors.notFound('Booking', event.locals.requestId);
	}

	const result = approveBooking(id, user.id);

	if (!result.success) {
		return errors.badRequest(result.error || 'Failed to approve booking', event.locals.requestId);
	}

	// Fetch the full booking with details
	const updatedBooking = getServiceBookingById(id);

	return json({ booking: updatedBooking });
};
