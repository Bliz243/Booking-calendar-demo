import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateId, queryAll, queryOne, execute } from '$lib/server/db/client';
import { createQualificationSchema } from '$lib/schemas/service';
import type { QualificationRow } from '$lib/types/service';
import { rowToQualification } from '$lib/types/service';
import { requireAdmin } from '$lib/server/auth-guards';
import { errors } from '$lib/server/errors';

// GET /api/admin/qualifications - List all qualifications
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	const rows = queryAll<QualificationRow>(
		`SELECT * FROM qualifications WHERE user_id = ? ORDER BY name`,
		[user.id]
	);

	return json({
		qualifications: rows.map((r) => rowToQualification(r))
	});
};

// POST /api/admin/qualifications - Create a qualification
export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		return errors.validation('Invalid JSON body', event.locals.requestId);
	}

	const parsed = createQualificationSchema.safeParse(body);

	if (!parsed.success) {
		return errors.validation('Invalid input', event.locals.requestId, parsed.error.issues);
	}

	const { name, description } = parsed.data;

	// Check for duplicate name
	const existing = queryOne<QualificationRow>(
		`SELECT * FROM qualifications WHERE user_id = ? AND name = ?`,
		[user.id, name]
	);

	if (existing) {
		return errors.conflict('Qualification with this name already exists', event.locals.requestId);
	}

	const id = generateId();

	execute(`INSERT INTO qualifications (id, user_id, name, description) VALUES (?, ?, ?, ?)`, [
		id,
		user.id,
		name,
		description ?? null
	]);

	const row = queryOne<QualificationRow>(`SELECT * FROM qualifications WHERE id = ?`, [id]);

	if (!row) {
		return errors.internal(event.locals.requestId);
	}

	return json({ qualification: rowToQualification(row) }, { status: 201 });
};
