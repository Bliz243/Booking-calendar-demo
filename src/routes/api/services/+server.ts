import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryAll } from '$lib/server/db/client';
import type { ServiceRow } from '$lib/types/service';
import { rowToService } from '$lib/types/service';

// GET /api/services - List active services (public)
// Note: This is a public endpoint for customers viewing bookable services.
// In a multi-tenant setup, pass ownerId to scope to a specific business.
export const GET: RequestHandler = async ({ url }) => {
	const ownerId = url.searchParams.get('ownerId');

	// Build query - if no ownerId provided, return all active services
	// In production, you may want to require ownerId for multi-tenant isolation
	let query = `SELECT * FROM services WHERE is_active = 1`;
	const params: unknown[] = [];

	if (ownerId) {
		query += ` AND user_id = ?`;
		params.push(ownerId);
	}

	query += ` ORDER BY sort_order, name`;

	const rows = queryAll<ServiceRow>(query, params);

	// Return public-facing service info
	return json({
		services: rows.map((r) => {
			const service = rowToService(r);
			return {
				id: service.id,
				name: service.name,
				description: service.description,
				color: service.color,
				priceCents: service.priceCents,
				durationMinutes: service.durationMinutes,
				minDurationMinutes: service.minDurationMinutes,
				maxDurationMinutes: service.maxDurationMinutes,
				requiresApproval: service.requiresApproval,
				capacity: service.capacity
			};
		})
	});
};
