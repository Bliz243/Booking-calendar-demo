import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, execute } from '$lib/server/db/client';
import { createResourceTypeSchema } from '$lib/schemas/resource';
import type { ResourceTypeRow } from '$lib/types/resource';
import { rowToResourceType } from '$lib/types/resource';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/resource-types - List all resource types
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	const rows = queryAll<ResourceTypeRow>(
		`SELECT * FROM resource_types WHERE user_id = ? ORDER BY name`,
		[user.id]
	);

	return json({
		resourceTypes: rows.map(rowToResourceType)
	});
};

// POST /api/resource-types - Create a resource type
export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createResourceTypeSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { name, color } = parsed.data;
	const id = generateId();

	execute(`INSERT INTO resource_types (id, user_id, name, color) VALUES (?, ?, ?, ?)`, [
		id,
		user.id,
		name,
		color
	]);

	return json({ resourceType: { id, userId: user.id, name, color } }, { status: 201 });
};
