import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceBookingsQuerySchema, createStaffBookingSchema } from '$lib/schemas/service';
import { listServiceBookings, createServiceBooking } from '$lib/server/services/booking-service';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/bookings - List all bookings with filters
export const GET: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { url } = event;

	const params: Record<string, string | undefined> = {
		serviceId: url.searchParams.get('serviceId') || undefined,
		status: url.searchParams.get('status') || undefined,
		approvalStatus: url.searchParams.get('approvalStatus') || undefined,
		startDate: url.searchParams.get('startDate') || undefined,
		endDate: url.searchParams.get('endDate') || undefined,
		customerEmail: url.searchParams.get('customerEmail') || undefined
	};

	const parsed = getServiceBookingsQuerySchema.safeParse(params);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	const bookings = listServiceBookings({
		serviceId: parsed.data.serviceId,
		status: parsed.data.status,
		approvalStatus: parsed.data.approvalStatus,
		startDate: parsed.data.startDate,
		endDate: parsed.data.endDate,
		customerEmail: parsed.data.customerEmail
	});

	return json({ bookings });
};

// POST /api/admin/bookings - Create a booking (staff)
export const POST: RequestHandler = async (event) => {
	const user = requireStaff(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createStaffBookingSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const result = createServiceBooking(
		{
			serviceId: parsed.data.serviceId,
			startTime: parsed.data.startTime,
			endTime: parsed.data.endTime,
			customerName: parsed.data.customerName,
			customerEmail: parsed.data.customerEmail,
			customerPhone: parsed.data.customerPhone,
			customerNotes: parsed.data.customerNotes,
			resourceSelections: parsed.data.resourceSelections
		},
		{
			isStaff: true,
			staffId: user.id,
			overrideMinNotice: parsed.data.overrideMinNotice,
			overrideOperatingHours: parsed.data.overrideOperatingHours,
			assignedResourceIds: parsed.data.assignedResourceIds
		}
	);

	if (result.error) {
		return errors.badRequest(result.error, event.locals.requestId);
	}

	return json({ booking: result.booking }, { status: 201 });
};
