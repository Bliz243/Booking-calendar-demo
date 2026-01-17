import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadServiceContext } from '$lib/server/services/availability-calculator';

// GET /api/services/[id] - Get service info (public)
export const GET: RequestHandler = async ({ params }) => {
	const ctx = loadServiceContext(params.id);

	if (!ctx) {
		return json({ error: 'Service not found' }, { status: 404 });
	}

	if (!ctx.service.isActive) {
		return json({ error: 'Service is not available' }, { status: 404 });
	}

	// Return public-facing service info (hide internal details)
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
			operatingDays: ctx.service.operatingDays,
			operatingStartTime: ctx.service.operatingStartTime,
			operatingEndTime: ctx.service.operatingEndTime,
			minNoticeHours: ctx.service.minNoticeHours,
			maxAdvanceDays: ctx.service.maxAdvanceDays,
			cancellationHours: ctx.service.cancellationHours,
			requiresApproval: ctx.service.requiresApproval,
			capacity: ctx.service.capacity
		}
	});
};
