import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryOne, execute, transaction } from '$lib/server/db/client';
import { updateQualificationSchema } from '$lib/schemas/service';
import type { QualificationRow } from '$lib/types/service';
import { rowToQualification } from '$lib/types/service';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/qualifications/[id] - Get a qualification
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const row = queryOne<QualificationRow>(
		`SELECT * FROM qualifications WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!row) {
		return errors.notFound('Qualification', event.locals.requestId);
	}

	return json({ qualification: rowToQualification(row) });
};

// PATCH /api/admin/qualifications/[id] - Update a qualification
export const PATCH: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = updateQualificationSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const row = queryOne<QualificationRow>(
		`SELECT * FROM qualifications WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!row) {
		return errors.notFound('Qualification', event.locals.requestId);
	}

	const { name, description } = parsed.data;
	const updates: string[] = [];
	const updateParams: unknown[] = [];

	if (name !== undefined) {
		// Check for duplicate name
		const existing = queryOne<QualificationRow>(
			`SELECT * FROM qualifications WHERE user_id = ? AND name = ? AND id != ?`,
			[user.id, name, id]
		);

		if (existing) {
			return errors.conflict('Qualification with this name already exists', event.locals.requestId);
		}

		updates.push('name = ?');
		updateParams.push(name);
	}

	if (description !== undefined) {
		updates.push('description = ?');
		updateParams.push(description);
	}

	if (updates.length > 0) {
		updateParams.push(id);
		execute(`UPDATE qualifications SET ${updates.join(', ')} WHERE id = ?`, updateParams);
	}

	const updatedRow = queryOne<QualificationRow>(`SELECT * FROM qualifications WHERE id = ?`, [id]);

	if (!updatedRow) {
		return errors.internal(event.locals.requestId);
	}

	return json({ qualification: rowToQualification(updatedRow) });
};

// DELETE /api/admin/qualifications/[id] - Delete a qualification
export const DELETE: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { id } = event.params;

	const row = queryOne<QualificationRow>(
		`SELECT * FROM qualifications WHERE id = ? AND user_id = ?`,
		[id, user.id]
	);

	if (!row) {
		return errors.notFound('Qualification', event.locals.requestId);
	}

	transaction(() => {
		// Remove from resource qualifications
		execute(`DELETE FROM resource_qualifications WHERE qualification_id = ?`, [id]);
		// Delete the qualification
		execute(`DELETE FROM qualifications WHERE id = ?`, [id]);
	});

	return json({ success: true });
};
