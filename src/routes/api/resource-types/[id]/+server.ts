import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, execute } from '$lib/server/db/client';
import { updateResourceTypeSchema } from '$lib/schemas/resource';
import type { ResourceTypeRow } from '$lib/types/resource';
import { rowToResourceType } from '$lib/types/resource';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/resource-types/[id] - Get a resource type
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const row = queryOne<ResourceTypeRow>(
		`SELECT * FROM resource_types WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!row) {
		return errors.notFound('Resource type', event.locals.requestId);
	}

	return json({ resourceType: rowToResourceType(row) });
};

// PATCH /api/resource-types/[id] - Update a resource type
export const PATCH: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const existing = queryOne<ResourceTypeRow>(
		`SELECT * FROM resource_types WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!existing) {
		return errors.notFound('Resource type', event.locals.requestId);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateResourceTypeSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const updates: string[] = [];
	const values: unknown[] = [];

	if (parsed.data.name !== undefined) {
		updates.push('name = ?');
		values.push(parsed.data.name);
	}

	if (parsed.data.color !== undefined) {
		updates.push('color = ?');
		values.push(parsed.data.color);
	}

	if (updates.length > 0) {
		values.push(id, user.id);
		execute(`UPDATE resource_types SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
	}

	const updated = queryOne<ResourceTypeRow>(`SELECT * FROM resource_types WHERE id = ?`, [id]);

	if (!updated) {
		return errors.internal(event.locals.requestId);
	}

	return json({ resourceType: rowToResourceType(updated) });
};

// DELETE /api/resource-types/[id] - Delete a resource type
export const DELETE: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const existing = queryOne<ResourceTypeRow>(
		`SELECT * FROM resource_types WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!existing) {
		return errors.notFound('Resource type', event.locals.requestId);
	}

	// Check if there are resources using this type
	const resourceCount = queryOne<{ count: number }>(
		`SELECT COUNT(*) as count FROM resources WHERE resource_type_id = ?`,
		[id]
	);

	if (resourceCount && resourceCount.count > 0) {
		return errors.badRequest(
			'Cannot delete resource type that has resources. Delete resources first.',
			event.locals.requestId
		);
	}

	execute(`DELETE FROM resource_types WHERE id = ? AND user_id = ?`, [id, user.id]);

	return json({ success: true });
};
