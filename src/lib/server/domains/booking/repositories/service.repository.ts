import { queryOne, queryAll, execute, generateId } from '$lib/server/db/client';
import type { ServiceRow, ServiceResourceRequirementRow } from '$lib/types/service';

export interface ServiceWithRequirementsRow extends ServiceRow {
	requirements?: (ServiceResourceRequirementRow & { type_name: string; type_color: string })[];
}

export interface CreateServiceData {
	userId: string;
	name: string;
	description?: string | null;
	color?: string;
	priceCents?: number | null;
	durationMinutes: number;
	minDurationMinutes?: number | null;
	maxDurationMinutes?: number | null;
	operatingDays?: string;
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;
	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;
}

export interface UpdateServiceData {
	name?: string;
	description?: string | null;
	color?: string;
	priceCents?: number | null;
	durationMinutes?: number;
	minDurationMinutes?: number | null;
	maxDurationMinutes?: number | null;
	operatingDays?: string;
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;
	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;
	isActive?: boolean;
	sortOrder?: number;
}

export const serviceRepository = {
	findById(id: string): ServiceRow | null {
		return queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ?`, [id]) ?? null;
	},

	findByIdAndUserId(id: string, userId: string): ServiceRow | null {
		return (
			queryOne<ServiceRow>(`SELECT * FROM services WHERE id = ? AND user_id = ?`, [id, userId]) ??
			null
		);
	},

	findAllByUserId(userId: string): ServiceRow[] {
		return queryAll<ServiceRow>(
			`SELECT * FROM services WHERE user_id = ? ORDER BY sort_order, name`,
			[userId]
		);
	},

	findActiveByUserId(userId: string): ServiceRow[] {
		return queryAll<ServiceRow>(
			`SELECT * FROM services WHERE user_id = ? AND is_active = 1 ORDER BY sort_order, name`,
			[userId]
		);
	},

	findAllActive(): ServiceRow[] {
		return queryAll<ServiceRow>(
			`SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, name`
		);
	},

	findActiveByOwner(ownerId: string): ServiceRow[] {
		return queryAll<ServiceRow>(
			`SELECT * FROM services WHERE user_id = ? AND is_active = 1 ORDER BY sort_order, name`,
			[ownerId]
		);
	},

	create(data: CreateServiceData): ServiceRow {
		const id = generateId();
		execute(
			`INSERT INTO services (
				id, user_id, name, description, color, price_cents,
				duration_minutes, min_duration_minutes, max_duration_minutes,
				operating_days, operating_start_time, operating_end_time,
				min_notice_hours, max_advance_days, buffer_minutes,
				max_concurrent_per_customer, cancellation_hours,
				requires_approval, capacity, is_active, sort_order
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
			[
				id,
				data.userId,
				data.name,
				data.description ?? null,
				data.color ?? '#3b82f6',
				data.priceCents ?? null,
				data.durationMinutes,
				data.minDurationMinutes ?? null,
				data.maxDurationMinutes ?? null,
				data.operatingDays ?? '1,2,3,4,5',
				data.operatingStartTime ?? '09:00',
				data.operatingEndTime ?? '17:00',
				data.minNoticeHours ?? 1,
				data.maxAdvanceDays ?? 30,
				data.bufferMinutes ?? 0,
				data.maxConcurrentPerCustomer ?? 0,
				data.cancellationHours ?? 24,
				data.requiresApproval ? 1 : 0,
				data.capacity ?? 1
			]
		);
		return this.findById(id)!;
	},

	update(id: string, data: UpdateServiceData): ServiceRow | null {
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
		if (data.color !== undefined) {
			updates.push('color = ?');
			params.push(data.color);
		}
		if (data.priceCents !== undefined) {
			updates.push('price_cents = ?');
			params.push(data.priceCents);
		}
		if (data.durationMinutes !== undefined) {
			updates.push('duration_minutes = ?');
			params.push(data.durationMinutes);
		}
		if (data.minDurationMinutes !== undefined) {
			updates.push('min_duration_minutes = ?');
			params.push(data.minDurationMinutes);
		}
		if (data.maxDurationMinutes !== undefined) {
			updates.push('max_duration_minutes = ?');
			params.push(data.maxDurationMinutes);
		}
		if (data.operatingDays !== undefined) {
			updates.push('operating_days = ?');
			params.push(data.operatingDays);
		}
		if (data.operatingStartTime !== undefined) {
			updates.push('operating_start_time = ?');
			params.push(data.operatingStartTime);
		}
		if (data.operatingEndTime !== undefined) {
			updates.push('operating_end_time = ?');
			params.push(data.operatingEndTime);
		}
		if (data.minNoticeHours !== undefined) {
			updates.push('min_notice_hours = ?');
			params.push(data.minNoticeHours);
		}
		if (data.maxAdvanceDays !== undefined) {
			updates.push('max_advance_days = ?');
			params.push(data.maxAdvanceDays);
		}
		if (data.bufferMinutes !== undefined) {
			updates.push('buffer_minutes = ?');
			params.push(data.bufferMinutes);
		}
		if (data.maxConcurrentPerCustomer !== undefined) {
			updates.push('max_concurrent_per_customer = ?');
			params.push(data.maxConcurrentPerCustomer);
		}
		if (data.cancellationHours !== undefined) {
			updates.push('cancellation_hours = ?');
			params.push(data.cancellationHours);
		}
		if (data.requiresApproval !== undefined) {
			updates.push('requires_approval = ?');
			params.push(data.requiresApproval ? 1 : 0);
		}
		if (data.capacity !== undefined) {
			updates.push('capacity = ?');
			params.push(data.capacity);
		}
		if (data.isActive !== undefined) {
			updates.push('is_active = ?');
			params.push(data.isActive ? 1 : 0);
		}
		if (data.sortOrder !== undefined) {
			updates.push('sort_order = ?');
			params.push(data.sortOrder);
		}

		if (updates.length > 0) {
			params.push(id);
			execute(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`, params);
		}

		return this.findById(id);
	},

	delete(id: string): void {
		execute(`DELETE FROM services WHERE id = ?`, [id]);
	},

	// Requirements
	findRequirements(
		serviceId: string
	): (ServiceResourceRequirementRow & { type_name: string; type_color: string })[] {
		return queryAll<ServiceResourceRequirementRow & { type_name: string; type_color: string }>(
			`SELECT srr.*, rt.name as type_name, rt.color as type_color
			 FROM service_resource_requirements srr
			 JOIN resource_types rt ON rt.id = srr.resource_type_id
			 WHERE srr.service_id = ?`,
			[serviceId]
		);
	},

	findRequirementById(id: string): ServiceResourceRequirementRow | null {
		return (
			queryOne<ServiceResourceRequirementRow>(
				`SELECT * FROM service_resource_requirements WHERE id = ?`,
				[id]
			) ?? null
		);
	},

	findRequirementByServiceAndType(
		serviceId: string,
		resourceTypeId: string
	): ServiceResourceRequirementRow | null {
		return (
			queryOne<ServiceResourceRequirementRow>(
				`SELECT * FROM service_resource_requirements WHERE service_id = ? AND resource_type_id = ?`,
				[serviceId, resourceTypeId]
			) ?? null
		);
	},

	createRequirement(
		serviceId: string,
		resourceTypeId: string,
		quantity: number,
		isOptional: boolean,
		requiredQualifications: string[]
	): ServiceResourceRequirementRow {
		const id = generateId();
		execute(
			`INSERT INTO service_resource_requirements (id, service_id, resource_type_id, quantity, is_optional, required_qualifications)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[
				id,
				serviceId,
				resourceTypeId,
				quantity,
				isOptional ? 1 : 0,
				JSON.stringify(requiredQualifications)
			]
		);
		return this.findRequirementById(id)!;
	},

	updateRequirement(
		id: string,
		data: { quantity?: number; isOptional?: boolean; requiredQualifications?: string[] }
	): ServiceResourceRequirementRow | null {
		const updates: string[] = [];
		const params: unknown[] = [];

		if (data.quantity !== undefined) {
			updates.push('quantity = ?');
			params.push(data.quantity);
		}
		if (data.isOptional !== undefined) {
			updates.push('is_optional = ?');
			params.push(data.isOptional ? 1 : 0);
		}
		if (data.requiredQualifications !== undefined) {
			updates.push('required_qualifications = ?');
			params.push(JSON.stringify(data.requiredQualifications));
		}

		if (updates.length > 0) {
			params.push(id);
			execute(
				`UPDATE service_resource_requirements SET ${updates.join(', ')} WHERE id = ?`,
				params
			);
		}

		return this.findRequirementById(id);
	},

	deleteRequirement(id: string): void {
		execute(`DELETE FROM service_resource_requirements WHERE id = ?`, [id]);
	},

	deleteAllRequirements(serviceId: string): void {
		execute(`DELETE FROM service_resource_requirements WHERE service_id = ?`, [serviceId]);
	},

	// Booking count for deletion check
	countActiveBookings(serviceId: string): number {
		const result = queryOne<{ count: number }>(
			`SELECT COUNT(*) as count FROM service_bookings
			 WHERE service_id = ? AND status IN ('pending', 'confirmed')`,
			[serviceId]
		);
		return result?.count ?? 0;
	}
};
