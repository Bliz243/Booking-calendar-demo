import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, queryOne, execute, transaction } from '$lib/server/db/client';
import { updateServiceSchema } from '$lib/schemas/service';
import type {
	ServiceRow,
	ServiceResourceRequirementRow,
	ServiceWithRequirements
} from '$lib/types/service';
import { rowToService, rowToServiceResourceRequirement } from '$lib/types/service';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/services/[id] - Get service details
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const serviceRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
		id,
		user.id
	]);

	if (!serviceRow) {
		return errors.notFound('Service', event.locals.requestId);
	}

	const requirementRows = queryAll<
		ServiceResourceRequirementRow & { type_name: string; type_color: string }
	>(
		`
		SELECT srr.*, rt.name as type_name, rt.color as type_color
		FROM service_resource_requirements srr
		JOIN resource_types rt ON rt.id = srr.resource_type_id
		WHERE srr.service_id = ?
		`,
		[id]
	);

	const service: ServiceWithRequirements = {
		...rowToService(serviceRow),
		requirements: requirementRows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}))
	};

	return json({ service });
};

// PATCH /api/admin/services/[id] - Update a service
export const PATCH: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateServiceSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const serviceRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
		id,
		user.id
	]);

	if (!serviceRow) {
		return errors.notFound('Service', event.locals.requestId);
	}

	const updates: string[] = [];
	const updateParams: unknown[] = [];

	const {
		name,
		description,
		color,
		priceCents,
		durationMinutes,
		minDurationMinutes,
		maxDurationMinutes,
		operatingDays,
		operatingStartTime,
		operatingEndTime,
		minNoticeHours,
		maxAdvanceDays,
		bufferMinutes,
		maxConcurrentPerCustomer,
		cancellationHours,
		requiresApproval,
		capacity,
		isActive,
		sortOrder
	} = parsed.data;

	if (name !== undefined) {
		updates.push('name = ?');
		updateParams.push(name);
	}
	if (description !== undefined) {
		updates.push('description = ?');
		updateParams.push(description);
	}
	if (color !== undefined) {
		updates.push('color = ?');
		updateParams.push(color);
	}
	if (priceCents !== undefined) {
		updates.push('price_cents = ?');
		updateParams.push(priceCents);
	}
	if (durationMinutes !== undefined) {
		updates.push('duration_minutes = ?');
		updateParams.push(durationMinutes);
	}
	if (minDurationMinutes !== undefined) {
		updates.push('min_duration_minutes = ?');
		updateParams.push(minDurationMinutes);
	}
	if (maxDurationMinutes !== undefined) {
		updates.push('max_duration_minutes = ?');
		updateParams.push(maxDurationMinutes);
	}
	if (operatingDays !== undefined) {
		updates.push('operating_days = ?');
		updateParams.push(operatingDays.join(','));
	}
	if (operatingStartTime !== undefined) {
		updates.push('operating_start_time = ?');
		updateParams.push(operatingStartTime);
	}
	if (operatingEndTime !== undefined) {
		updates.push('operating_end_time = ?');
		updateParams.push(operatingEndTime);
	}
	if (minNoticeHours !== undefined) {
		updates.push('min_notice_hours = ?');
		updateParams.push(minNoticeHours);
	}
	if (maxAdvanceDays !== undefined) {
		updates.push('max_advance_days = ?');
		updateParams.push(maxAdvanceDays);
	}
	if (bufferMinutes !== undefined) {
		updates.push('buffer_minutes = ?');
		updateParams.push(bufferMinutes);
	}
	if (maxConcurrentPerCustomer !== undefined) {
		updates.push('max_concurrent_per_customer = ?');
		updateParams.push(maxConcurrentPerCustomer);
	}
	if (cancellationHours !== undefined) {
		updates.push('cancellation_hours = ?');
		updateParams.push(cancellationHours);
	}
	if (requiresApproval !== undefined) {
		updates.push('requires_approval = ?');
		updateParams.push(requiresApproval ? 1 : 0);
	}
	if (capacity !== undefined) {
		updates.push('capacity = ?');
		updateParams.push(capacity);
	}
	if (isActive !== undefined) {
		updates.push('is_active = ?');
		updateParams.push(isActive ? 1 : 0);
	}
	if (sortOrder !== undefined) {
		updates.push('sort_order = ?');
		updateParams.push(sortOrder);
	}

	if (updates.length > 0) {
		updateParams.push(id);
		execute(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, updateParams);
	}

	// Fetch updated service
	const updatedRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ?`, [id]);

	if (!updatedRow) {
		return errors.internal(event.locals.requestId);
	}

	const updatedRequirementRows = queryAll<
		ServiceResourceRequirementRow & { type_name: string; type_color: string }
	>(
		`
		SELECT srr.*, rt.name as type_name, rt.color as type_color
		FROM service_resource_requirements srr
		JOIN resource_types rt ON rt.id = srr.resource_type_id
		WHERE srr.service_id = ?
		`,
		[id]
	);

	const service: ServiceWithRequirements = {
		...rowToService(updatedRow),
		requirements: updatedRequirementRows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}))
	};

	return json({ service });
};

// DELETE /api/admin/services/[id] - Delete a service
export const DELETE: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const serviceRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
		id,
		user.id
	]);

	if (!serviceRow) {
		return errors.notFound('Service', event.locals.requestId);
	}

	// Check for active bookings
	const activeBookings = queryOne<{ count: number }>(
		`
		SELECT COUNT(*) as count FROM service_bookings
		WHERE service_id = ? AND status IN ('pending', 'confirmed')
		`,
		[id]
	);

	if (activeBookings && activeBookings.count > 0) {
		return errors.badRequest(
			'Cannot delete service with active bookings. Cancel or complete them first.',
			event.locals.requestId
		);
	}

	transaction(() => {
		// Delete resource requirements first
		execute(`DELETE FROM service_resource_requirements WHERE service_id = ?`, [id]);
		// Delete the service
		execute(`DELETE FROM services WHERE id = ?`, [id]);
	});

	return json({ success: true });
};
