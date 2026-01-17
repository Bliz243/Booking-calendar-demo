import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, queryAll, execute } from '$lib/server/db/client';
import { updateResourceSchema } from '$lib/schemas/resource';
import type { ResourceRow, ResourceTypeRow } from '$lib/types/resource';
import { rowToResource } from '$lib/types/resource';
import { requireStaff } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/resources/[id] - Get a single resource
export const GET: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const row = queryOne<ResourceRow & { type_name: string; type_color: string; user_id: string }>(
		`SELECT r.*, rt.name as type_name, rt.color as type_color, rt.user_id
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Resource', event.locals.requestId);
	}

	return json({
		resource: {
			...rowToResource(row),
			typeName: row.type_name,
			typeColor: row.type_color
		}
	});
};

// PATCH /api/resources/[id] - Update a resource
export const PATCH: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const row = queryOne<ResourceRow & { user_id: string }>(
		`SELECT r.*, rt.user_id
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Resource', event.locals.requestId);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateResourceSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const updates = parsed.data;
	const setClauses: string[] = [];
	const values: unknown[] = [];

	if (updates.name !== undefined) {
		setClauses.push('name = ?');
		values.push(updates.name);
	}
	if (updates.description !== undefined) {
		setClauses.push('description = ?');
		values.push(updates.description);
	}
	if (updates.capacity !== undefined) {
		setClauses.push('capacity = ?');
		values.push(updates.capacity);
	}
	if (updates.location !== undefined) {
		setClauses.push('location = ?');
		values.push(updates.location);
	}
	if (updates.attributes !== undefined) {
		setClauses.push('attributes = ?');
		values.push(JSON.stringify(updates.attributes));
	}
	if (updates.isActive !== undefined) {
		setClauses.push('is_active = ?');
		values.push(updates.isActive ? 1 : 0);
	}

	if (setClauses.length > 0) {
		values.push(id);
		execute(`UPDATE resources SET ${setClauses.join(', ')} WHERE id = ?`, values);
	}

	const updatedRow = queryOne<ResourceRow & { type_name: string; type_color: string }>(
		`SELECT r.*, rt.name as type_name, rt.color as type_color
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	return json({
		resource: {
			...rowToResource(updatedRow!),
			typeName: updatedRow!.type_name,
			typeColor: updatedRow!.type_color
		}
	});
};

// DELETE /api/resources/[id] - Delete a resource
export const DELETE: RequestHandler = async (event) => {
	const user = requireStaff(event);
	const { id } = event.params;

	const row = queryOne<ResourceRow & { user_id: string }>(
		`SELECT r.*, rt.user_id
     FROM resources r
     INNER JOIN resource_types rt ON r.resource_type_id = rt.id
     WHERE r.id = ?`,
		[id]
	);

	if (!row || row.user_id !== user.id) {
		return errors.notFound('Resource', event.locals.requestId);
	}

	execute('DELETE FROM resources WHERE id = ?', [id]);

	return json({ success: true });
};
