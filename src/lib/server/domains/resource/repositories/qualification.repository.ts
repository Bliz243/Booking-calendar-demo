import { queryOne, queryAll, execute, generateId } from '$lib/server/db/client';
import type { QualificationRow } from '$lib/types/service';

export const qualificationRepository = {
	findById(id: string): QualificationRow | null {
		return queryOne<QualificationRow>(`SELECT * FROM qualifications WHERE id = ?`, [id]) ?? null;
	},

	findByIdAndUserId(id: string, userId: string): QualificationRow | null {
		return (
			queryOne<QualificationRow>(`SELECT * FROM qualifications WHERE id = ? AND user_id = ?`, [
				id,
				userId
			]) ?? null
		);
	},

	findAllByUserId(userId: string): QualificationRow[] {
		return queryAll<QualificationRow>(
			`SELECT * FROM qualifications WHERE user_id = ? ORDER BY name`,
			[userId]
		);
	},

	findByName(userId: string, name: string): QualificationRow | null {
		return (
			queryOne<QualificationRow>(`SELECT * FROM qualifications WHERE user_id = ? AND name = ?`, [
				userId,
				name
			]) ?? null
		);
	},

	findByNameExcluding(userId: string, name: string, excludeId: string): QualificationRow | null {
		return (
			queryOne<QualificationRow>(
				`SELECT * FROM qualifications WHERE user_id = ? AND name = ? AND id != ?`,
				[userId, name, excludeId]
			) ?? null
		);
	},

	create(userId: string, name: string, description: string | null): QualificationRow {
		const id = generateId();
		execute(`INSERT INTO qualifications (id, user_id, name, description) VALUES (?, ?, ?, ?)`, [
			id,
			userId,
			name,
			description
		]);
		return this.findById(id)!;
	},

	update(
		id: string,
		data: { name?: string; description?: string | null }
	): QualificationRow | null {
		const updates: string[] = [];
		const params: unknown[] = [];

		if (data.name !== undefined) {
			updates.push('name = ?');
			params.push(data.name);
		}
		if (data.description !== undefined) {
			updates.push('description = ?');
			params.push(data.description);
		}

		if (updates.length > 0) {
			params.push(id);
			execute(`UPDATE qualifications SET ${updates.join(', ')} WHERE id = ?`, params);
		}

		return this.findById(id);
	},

	delete(id: string): void {
		// First remove from resource_qualifications
		execute(`DELETE FROM resource_qualifications WHERE qualification_id = ?`, [id]);
		// Then delete the qualification
		execute(`DELETE FROM qualifications WHERE id = ?`, [id]);
	}
};
