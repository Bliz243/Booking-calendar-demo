import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, queryOne, execute } from '$lib/server/db/client';
import { createResourceSchema, getResourcesQuerySchema } from '$lib/schemas/resource';
import type { ResourceRow, ResourceTypeRow } from '$lib/types/resource';
import { rowToResource } from '$lib/types/resource';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/resources - List resources
export const GET: RequestHandler = async (event) => {
	const user = requireStaff(event);

	const params = {
		resourceTypeId: event.url.searchParams.get('resourceTypeId') || undefined,
		isActive: event.url.searchParams.get('isActive') || undefined
	};

	const parsed = getResourcesQuerySchema.safeParse(params);

	if (!parsed.success) {
		return errors.validation('Invalid query params', event.locals.requestId, parsed.error.issues);
	}

	let query = `
    SELECT r.*, rt.name as type_name, rt.color as type_color
    FROM resources r
    INNER JOIN resource_types rt ON r.resource_type_id = rt.id
    WHERE rt.user_id = ?
  `;
	const queryParams: unknown[] = [user.id];

	if (parsed.data.resourceTypeId) {
		query += ' AND r.resource_type_id = ?';
		queryParams.push(parsed.data.resourceTypeId);
	}

	if (parsed.data.isActive !== undefined) {
		query += ' AND r.is_active = ?';
		queryParams.push(parsed.data.isActive ? 1 : 0);
	}

	query += ' ORDER BY rt.name, r.name';

	const rows = queryAll<ResourceRow & { type_name: string; type_color: string }>(
		query,
		queryParams
	);

	return json({
		resources: rows.map((r) => ({
			...rowToResource(r),
			typeName: r.type_name,
			typeColor: r.type_color
		}))
	});
};

// POST /api/resources - Create a resource
export const POST: RequestHandler = async (event) => {
	const user = requireStaff(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createResourceSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { resourceTypeId, name, description, capacity, location, attributes } = parsed.data;

	// Verify resource type exists and belongs to user
	const resourceType = queryOne<ResourceTypeRow>(
		'SELECT * FROM resource_types WHERE id = ? AND user_id = ?',
		[resourceTypeId, user.id]
	);

	if (!resourceType) {
		return errors.notFound('Resource type', event.locals.requestId);
	}

	const id = generateId();

	execute(
		`INSERT INTO resources (id, resource_type_id, name, description, capacity, location, attributes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			id,
			resourceTypeId,
			name,
			description || null,
			capacity || null,
			location || null,
			JSON.stringify(attributes || {}),
			1
		]
	);

	const row = queryOne<ResourceRow & { type_name: string; type_color: string }>(
		`SELECT r.*, rt.name as type_name, rt.color as type_color
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	if (!row) {
		return errors.internal(event.locals.requestId);
	}

	return json(
		{
			resource: {
				...rowToResource(row),
				typeName: row.type_name,
				typeColor: row.type_color
			}
		},
		{ status: 201 }
	);
};
