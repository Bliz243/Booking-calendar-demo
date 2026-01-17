import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, queryOne, execute } from '$lib/server/db/client';
import {
	createServiceResourceRequirementSchema,
	updateServiceResourceRequirementSchema
} from '$lib/schemas/service';
import type { ServiceResourceRequirementRow, ServiceRow } from '$lib/types/service';
import { rowToServiceResourceRequirement } from '$lib/types/service';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/services/[id]/requirements - List requirements for a service
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

	return json({
		requirements: requirementRows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}))
	});
};

// POST /api/admin/services/[id]/requirements - Add a requirement
export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id: serviceId } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createServiceResourceRequirementSchema.safeParse({
		...body,
		serviceId
	});

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const serviceRow = queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [
		serviceId,
		user.id
	]);

	if (!serviceRow) {
		return errors.notFound('Service', event.locals.requestId);
	}

	// Verify resource type exists
	const resourceType = queryOne<{ id: string; name: string; color: string }>(
		`SELECT id, name, color FROM resource_types WHERE id = ? AND user_id = ?`,
		[parsed.data.resourceTypeId, user.id]
	);

	if (!resourceType) {
		return errors.notFound('Resource type', event.locals.requestId);
	}

	// Check for duplicate
	const existing = queryOne<{ id: string }>(
		`SELECT id FROM service_resource_requirements WHERE service_id = ? AND resource_type_id = ?`,
		[serviceId, parsed.data.resourceTypeId]
	);

	if (existing) {
		return errors.conflict('Resource type already added to this service', event.locals.requestId);
	}

	const id = generateId();

	execute(
		`
		INSERT INTO service_resource_requirements (
			id, service_id, resource_type_id, quantity, is_optional, required_qualifications
		) VALUES (?, ?, ?, ?, ?, ?)
		`,
		[
			id,
			serviceId,
			parsed.data.resourceTypeId,
			parsed.data.quantity,
			parsed.data.isOptional ? 1 : 0,
			JSON.stringify(parsed.data.requiredQualifications)
		]
	);

	const requirement = rowToServiceResourceRequirement({
		id,
		service_id: serviceId,
		resource_type_id: parsed.data.resourceTypeId,
		quantity: parsed.data.quantity,
		is_optional: parsed.data.isOptional ? 1 : 0,
		required_qualifications: JSON.stringify(parsed.data.requiredQualifications)
	});

	return json(
		{
			requirement: {
				...requirement,
				resourceTypeName: resourceType.name,
				resourceTypeColor: resourceType.color
			}
		},
		{ status: 201 }
	);
};

// DELETE /api/admin/services/[id]/requirements - Remove all requirements (bulk)
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

	execute(`DELETE FROM service_resource_requirements WHERE service_id = ?`, [id]);

	return json({ success: true });
};
