import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceBookingSchema } from '$lib/schemas/service';
import { createServiceBooking, getServiceBookingById } from '$lib/server/services/booking-service';
import { loadServiceContext } from '$lib/server/services/availability-calculator';

// POST /api/services/[id]/book - Create a booking (public)
export const POST: RequestHandler = async ({ params, request }) => {
	// Verify service exists and is active
	const ctx = loadServiceContext(params.id);

	if (!ctx) {
		return json({ error: 'Service not found' }, { status: 404 });
	}

	if (!ctx.service.isActive) {
		return json({ error: 'Service is not available' }, { status: 404 });
	}

	const body = await request.json();
	const parsed = createServiceBookingSchema.safeParse({
		...body,
		serviceId: params.id
	});

	if (!parsed.success) {
		return json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
	}

	const result = createServiceBooking({
		serviceId: params.id,
		startTime: parsed.data.startTime,
		endTime: parsed.data.endTime,
		customerName: parsed.data.customerName,
		customerEmail: parsed.data.customerEmail,
		customerPhone: parsed.data.customerPhone,
		customerNotes: parsed.data.customerNotes,
		resourceSelections: parsed.data.resourceSelections
	});

	if (result.error || !result.booking) {
		return json({ error: result.error || 'Failed to create booking' }, { status: 400 });
	}

	// Return the booking with service info
	const booking = getServiceBookingById(result.booking.id);

	return json(
		{
			booking: {
				id: booking!.id,
				serviceName: booking!.serviceName,
				serviceColor: booking!.serviceColor,
				customerName: booking!.customerName,
				customerEmail: booking!.customerEmail,
				startTime: booking!.startTime,
				endTime: booking!.endTime,
				status: booking!.status,
				requiresApproval: ctx.service.requiresApproval,
				cancellationHours: ctx.service.cancellationHours
			}
		},
		{ status: 201 }
	);
};
