import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAvailableSlotsQuerySchema } from '$lib/schemas/service';
import {
	getAvailableSlots,
	loadServiceContext
} from '$lib/server/services/availability-calculator';

// GET /api/services/[id]/slots - Get available slots for a service (public)
export const GET: RequestHandler = async ({ params, url }) => {
	const queryParams = {
		serviceId: params.id,
		start: url.searchParams.get('start') || undefined,
		end: url.searchParams.get('end') || undefined
	};

	const parsed = getAvailableSlotsQuerySchema.safeParse(queryParams);

	if (!parsed.success) {
		return json({ error: 'Invalid query params', details: parsed.error.issues }, { status: 400 });
	}

	// Check if service exists and is active
	const ctx = loadServiceContext(params.id);

	if (!ctx) {
		return json({ error: 'Service not found' }, { status: 404 });
	}

	if (!ctx.service.isActive) {
		return json({ error: 'Service is not available' }, { status: 404 });
	}

	// Get optional duration param for variable-duration services
	const durationParam = url.searchParams.get('duration');
	const durationMinutes = durationParam ? parseInt(durationParam, 10) : undefined;

	// Validate duration is within allowed range if specified
	if (durationMinutes !== undefined) {
		const minDuration = ctx.service.minDurationMinutes ?? ctx.service.durationMinutes;
		const maxDuration = ctx.service.maxDurationMinutes ?? ctx.service.durationMinutes;
		if (durationMinutes < minDuration || durationMinutes > maxDuration) {
			return json(
				{ error: `Duration must be between ${minDuration} and ${maxDuration} minutes` },
				{ status: 400 }
			);
		}
	}

	const slots = getAvailableSlots(params.id, parsed.data.start, parsed.data.end, {
		durationMinutes
	});

	// Also return service info for the public booking page
	return json({
		service: {
			id: ctx.service.id,
			name: ctx.service.name,
			description: ctx.service.description,
			color: ctx.service.color,
			priceCents: ctx.service.priceCents,
			durationMinutes: ctx.service.durationMinutes,
			minDurationMinutes: ctx.service.minDurationMinutes,
			maxDurationMinutes: ctx.service.maxDurationMinutes,
			bufferMinutes: ctx.service.bufferMinutes,
			cancellationHours: ctx.service.cancellationHours,
			requiresApproval: ctx.service.requiresApproval,
			capacity: ctx.service.capacity
		},
		slots: slots.map((slot) => ({
			startTime: slot.startTime.toISOString(),
			endTime: slot.endTime.toISOString(),
			availableResources: slot.availableResources,
			remainingCapacity: slot.remainingCapacity
		}))
	});
};
