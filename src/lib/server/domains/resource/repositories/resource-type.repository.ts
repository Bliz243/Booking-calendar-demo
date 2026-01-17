import { queryOne, queryAll, execute, generateId } from '$lib/server/db/client';
import type { ResourceTypeRow } from '$lib/types/resource';

export const resourceTypeRepository = {
	findById(id: string): ResourceTypeRow | null {
		return queryOne<ResourceTypeRow>(`SELECT * FROM resource_types WHERE id = ?`, [id]) ?? null;
	},

	findByIdAndUserId(id: string, userId: string): ResourceTypeRow | null {
		return (
			queryOne<ResourceTypeRow>(`SELECT * FROM resource_types WHERE id = ? AND user_id = ?`, [
				id,
				userId
			]) ?? null
		);
	},

	findAllByUserId(userId: string): ResourceTypeRow[] {
		return queryAll<ResourceTypeRow>(
			`SELECT * FROM resource_types WHERE user_id = ? ORDER BY name`,
			[userId]
		);
	},

	create(userId: string, name: string, color: string): ResourceTypeRow {
		const id = generateId();
		execute(`INSERT INTO resource_types (id, user_id, name, color) VALUES (?, ?, ?, ?)`, [
			id,
			userId,
			name,
			color
		]);
		return this.findById(id)!;
	},

	update(id: string, data: { name?: string; color?: string }): ResourceTypeRow | null {
		const updates: string[] = [];
		const params: unknown[] = [];

		if (data.name !== undefined) {
			updates.push('name = ?');
			params.push(data.name);
		}
		if (data.color !== undefined) {
			updates.push('color = ?');
			params.push(data.color);
		}

		if (updates.length > 0) {
			params.push(id);
			execute(`UPDATE resource_types SET ${updates.join(', ')} WHERE id = ?`, params);
		}

		return this.findById(id);
	},

	delete(id: string): void {
		execute(`DELETE FROM resource_types WHERE id = ?`, [id]);
	},

	countResources(resourceTypeId: string): number {
		const result = queryOne<{ count: number }>(
			`SELECT COUNT(*) as count FROM resources WHERE resource_type_id = ?`,
			[resourceTypeId]
		);
		return result?.count ?? 0;
	}
};
