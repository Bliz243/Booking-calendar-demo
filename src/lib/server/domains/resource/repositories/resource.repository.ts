import { queryOne, queryAll, execute, generateId } from '$lib/server/db/client';
import type { ResourceRow, ResourceAvailabilityRow } from '$lib/types/resource';

export interface ResourceWithTypeRow extends ResourceRow {
	type_name: string;
	type_color: string;
}

export interface CreateResourceData {
	resourceTypeId: string;
	name: string;
	description?: string | null;
	capacity?: number | null;
	location?: string | null;
	attributes?: Record<string, unknown>;
}

export interface UpdateResourceData {
	name?: string;
	description?: string | null;
	capacity?: number | null;
	location?: string | null;
	attributes?: Record<string, unknown>;
	isActive?: boolean;
}

export const resourceRepository = {
	findById(id: string): ResourceRow | null {
		return queryOne<ResourceRow>(`SELECT * FROM resources WHERE id = ?`, [id]) ?? null;
	},

	findByIdWithType(id: string): ResourceWithTypeRow | null {
		return (
			queryOne<ResourceWithTypeRow>(
				`SELECT r.*, rt.name as type_name, rt.color as type_color
			 FROM resources r
			 JOIN resource_types rt ON r.resource_type_id = rt.id
			 WHERE r.id = ?`,
				[id]
			) ?? null
		);
	},

	findAllByUserId(userId: string): ResourceWithTypeRow[] {
		return queryAll<ResourceWithTypeRow>(
			`SELECT r.*, rt.name as type_name, rt.color as type_color
			 FROM resources r
			 JOIN resource_types rt ON r.resource_type_id = rt.id
			 WHERE rt.user_id = ?
			 ORDER BY rt.name, r.name`,
			[userId]
		);
	},

	findByTypeId(resourceTypeId: string): ResourceRow[] {
		return queryAll<ResourceRow>(`SELECT * FROM resources WHERE resource_type_id = ?`, [
			resourceTypeId
		]);
	},

	findActiveByTypeId(resourceTypeId: string): ResourceRow[] {
		return queryAll<ResourceRow>(
			`SELECT * FROM resources WHERE resource_type_id = ? AND is_active = 1`,
			[resourceTypeId]
		);
	},

	findByFilters(
		userId: string,
		filters: { resourceTypeId?: string; isActive?: boolean }
	): ResourceWithTypeRow[] {
		let query = `
			SELECT r.*, rt.name as type_name, rt.color as type_color
			FROM resources r
			JOIN resource_types rt ON r.resource_type_id = rt.id
			WHERE rt.user_id = ?
		`;
		const params: unknown[] = [userId];

		if (filters.resourceTypeId) {
			query += ` AND r.resource_type_id = ?`;
			params.push(filters.resourceTypeId);
		}

		if (filters.isActive !== undefined) {
			query += ` AND r.is_active = ?`;
			params.push(filters.isActive ? 1 : 0);
		}

		query += ` ORDER BY rt.name, r.name`;

		return queryAll<ResourceWithTypeRow>(query, params);
	},

	create(data: CreateResourceData): ResourceRow {
		const id = generateId();
		execute(
			`INSERT INTO resources (id, resource_type_id, name, description, capacity, location, attributes, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
			[
				id,
				data.resourceTypeId,
				data.name,
				data.description ?? null,
				data.capacity ?? null,
				data.location ?? null,
				JSON.stringify(data.attributes ?? {})
			]
		);
		return this.findById(id)!;
	},

	update(id: string, data: UpdateResourceData): ResourceRow | null {
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
		if (data.capacity !== undefined) {
			updates.push('capacity = ?');
			params.push(data.capacity);
		}
		if (data.location !== undefined) {
			updates.push('location = ?');
			params.push(data.location);
		}
		if (data.attributes !== undefined) {
			updates.push('attributes = ?');
			params.push(JSON.stringify(data.attributes));
		}
		if (data.isActive !== undefined) {
			updates.push('is_active = ?');
			params.push(data.isActive ? 1 : 0);
		}

		if (updates.length > 0) {
			params.push(id);
			execute(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`, params);
		}

		return this.findById(id);
	},

	delete(id: string): void {
		execute(`DELETE FROM resources WHERE id = ?`, [id]);
	},

	// Availability methods
	findAvailability(resourceId: string): ResourceAvailabilityRow[] {
		return queryAll<ResourceAvailabilityRow>(
			`SELECT * FROM resource_availability WHERE resource_id = ? ORDER BY day_of_week, start_time`,
			[resourceId]
		);
	},

	findAvailabilityForDay(resourceId: string, dayOfWeek: number): ResourceAvailabilityRow[] {
		return queryAll<ResourceAvailabilityRow>(
			`SELECT * FROM resource_availability WHERE resource_id = ? AND day_of_week = ?`,
			[resourceId, dayOfWeek]
		);
	},

	createAvailability(
		resourceId: string,
		dayOfWeek: number,
		startTime: string,
		endTime: string
	): ResourceAvailabilityRow {
		const id = generateId();
		execute(
			`INSERT INTO resource_availability (id, resource_id, day_of_week, start_time, end_time)
			 VALUES (?, ?, ?, ?, ?)`,
			[id, resourceId, dayOfWeek, startTime, endTime]
		);
		return queryOne<ResourceAvailabilityRow>(`SELECT * FROM resource_availability WHERE id = ?`, [
			id
		])!;
	},

	deleteAvailability(availabilityId: string): void {
		execute(`DELETE FROM resource_availability WHERE id = ?`, [availabilityId]);
	},

	deleteAllAvailability(resourceId: string): void {
		execute(`DELETE FROM resource_availability WHERE resource_id = ?`, [resourceId]);
	},

	// Qualification methods
	findQualifications(resourceId: string): string[] {
		const rows = queryAll<{ qualification_id: string }>(
			`SELECT qualification_id FROM resource_qualifications WHERE resource_id = ?`,
			[resourceId]
		);
		return rows.map((r) => r.qualification_id);
	},

	addQualification(resourceId: string, qualificationId: string): void {
		const id = generateId();
		execute(
			`INSERT INTO resource_qualifications (id, resource_id, qualification_id) VALUES (?, ?, ?)`,
			[id, resourceId, qualificationId]
		);
	},

	removeQualification(resourceId: string, qualificationId: string): void {
		execute(`DELETE FROM resource_qualifications WHERE resource_id = ? AND qualification_id = ?`, [
			resourceId,
			qualificationId
		]);
	},

	setQualifications(resourceId: string, qualificationIds: string[]): void {
		// Remove all existing
		execute(`DELETE FROM resource_qualifications WHERE resource_id = ?`, [resourceId]);

		// Add new ones
		for (const qualificationId of qualificationIds) {
			this.addQualification(resourceId, qualificationId);
		}
	}
};
